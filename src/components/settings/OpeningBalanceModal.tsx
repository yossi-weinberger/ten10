import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { handleTransactionSubmit } from "@/lib/data-layer/transactionForm.service";
import {
  getInitialBalanceForPot,
  updateTransaction,
  TransactionUpdatePayload,
} from "@/lib/data-layer/transactions.service";
import { useDonationStore } from "@/lib/store";
import toast from "react-hot-toast";
import { logger } from "@/lib/logger";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Transaction } from "@/types/transaction";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES, CurrencyCode } from "@/lib/currencies";
import { Form } from "@/components/ui/form";
import { useForm, UseFormReturn } from "react-hook-form";
import type { TransactionFormValues } from "@/lib/schemas";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CurrencyConversionSection } from "@/components/forms/transaction-form-parts/CurrencyConversionSection";
import { OpeningBalanceHomeStyleStatCard } from "@/components/settings/OpeningBalanceHomeStyleStatCard";
import { ToggleChoiceCard } from "@/components/ui/toggle-choice-card";

// Derive currency codes tuple from CURRENCIES for type-safe Zod enum
const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [CurrencyCode, ...CurrencyCode[]];

/** Matches two ToggleChoiceCard columns: min-w/max-w 180px + gap-3 (same as pot/debt radio rows). */
const OPENING_BALANCE_TOGGLE_ROW_MAX_CLASS =
  "mx-auto w-full max-w-[calc(180px+0.75rem+180px)]";

/** Outer wrapper only — `relative` must wrap just the control so `top-full` sits under the input, not under padded box. */
const FIELD_MESSAGE_OUTER_CLASS = "pb-5";

interface OpeningBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Transaction | null;
  onUpdate?: (id: string, updates: Partial<Transaction>) => Promise<void>;
}

export function OpeningBalanceModal({
  isOpen,
  onClose,
  initialData,
  onUpdate,
}: OpeningBalanceModalProps) {
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");
  const { t: tTransactions } = useTranslation("transactions");
  const { settings } = useDonationStore();
  /** Match Zustand language — portal/dialog subtrees must not rely on html dir alone (see llm-instructions ui guidelines). */
  const layoutDir = settings.language === "he" ? "rtl" : "ltr";
  const trackChomeshSeparately = settings.trackChomeshSeparately;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvedTransaction, setResolvedTransaction] =
    useState<Transaction | null>(null);

  const isDesktopQuery = useMediaQuery("(min-width: 768px)");
  const [useDesktop, setUseDesktop] = useState(isDesktopQuery);
  const fetchGeneration = useRef(0);

  const formSchema = z.object({
    amount: z.coerce
      .number({
        message: tTransactions("transactionForm.validation.amount.number"),
      })
      .positive({
        message: tTransactions("transactionForm.validation.amount.positive"),
      }),
    balanceType: z.enum(["debt", "credit"]),
    balancePot: z.enum(["maaser", "chomesh"]),
    currency: z.enum(CURRENCY_CODES),
    conversion_rate: z.number().optional(),
    conversion_date: z.string().optional(),
    rate_source: z.enum(["auto", "manual"]).optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: initialData ? Math.abs(initialData.amount) : undefined,
      balanceType: initialData
        ? initialData.amount >= 0
          ? "debt"
          : "credit"
        : "debt",
      balancePot: initialData?.is_chomesh ? "chomesh" : "maaser",
      currency: settings.defaultCurrency as CurrencyCode,
    },
  });

  const balancePot = form.watch("balancePot");
  const isChomeshPot = balancePot === "chomesh";
  /** When split tracking is off, only the maaser pot is used for new entries / settings flow. */
  const potIsChomeshForFetch = trackChomeshSeparately && isChomeshPot;

  const applyTransactionToForm = useCallback(
    (row: Transaction) => {
      const displayCurrency = (row.original_currency || row.currency) as CurrencyCode;
      const displayAmount = Math.abs(row.original_amount ?? row.amount);
      form.reset({
        amount: displayAmount,
        balanceType: row.amount >= 0 ? "debt" : "credit",
        balancePot: row.is_chomesh ? "chomesh" : "maaser",
        currency: displayCurrency,
        conversion_rate: row.conversion_rate ?? undefined,
        conversion_date: row.conversion_date ?? undefined,
        rate_source: row.rate_source ?? undefined,
      });
    },
    [form]
  );

  const resetEmptyForPot = useCallback(
    (isChomesh: boolean) => {
      form.reset({
        amount: undefined,
        balanceType: "debt",
        balancePot: isChomesh ? "chomesh" : "maaser",
        currency: settings.defaultCurrency as CurrencyCode,
        conversion_rate: undefined,
        conversion_date: undefined,
        rate_source: undefined,
      });
    },
    [form, settings.defaultCurrency]
  );

  // Sync form with server row or prop when modal opens / pot changes
  useEffect(() => {
    if (!isOpen) {
      setResolvedTransaction(null);
      return;
    }

    const gen = ++fetchGeneration.current;
    const isChomesh = potIsChomeshForFetch;

    const run = async () => {
      // initialData set: apply when it matches the selected pot (or maaser-only mode). Otherwise fetch the correct pot row.
      // initialData null: skip straight to fetch — loads maaser/chomesh row per `isChomesh` (and `resetEmptyForPot` when missing).
      if (initialData) {
        if (
          !trackChomeshSeparately ||
          !!initialData.is_chomesh === isChomeshPot
        ) {
          if (gen !== fetchGeneration.current) return;
          setResolvedTransaction(initialData);
          applyTransactionToForm(initialData);
          return;
        }
      }

      try {
        const row = await getInitialBalanceForPot(isChomesh);
        if (gen !== fetchGeneration.current) return;
        setResolvedTransaction(row);
        if (row) {
          applyTransactionToForm(row);
        } else {
          resetEmptyForPot(isChomesh);
        }
      } catch (e) {
        logger.error("OpeningBalanceModal: failed to load row for pot", e);
        if (gen !== fetchGeneration.current) return;
        setResolvedTransaction(null);
        resetEmptyForPot(isChomesh);
      }
    };

    void run();
  }, [
    isOpen,
    isChomeshPot,
    potIsChomeshForFetch,
    trackChomeshSeparately,
    initialData,
    applyTransactionToForm,
    resetEmptyForPot,
  ]);

  // Lock the variant (Drawer/Dialog) when the modal is open
  useEffect(() => {
    if (!isOpen) setUseDesktop(isDesktopQuery);
  }, [isDesktopQuery, isOpen]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const isChomesh = trackChomeshSeparately
        ? values.balancePot === "chomesh"
        : !!resolvedTransaction?.is_chomesh;

      let finalAmount = values.balanceType === "debt" ? values.amount : -values.amount;
      const transactionPayload: Partial<Transaction> = {
        amount: finalAmount,
        currency: settings.defaultCurrency,
        original_amount: null,
        original_currency: null,
        conversion_rate: null,
        conversion_date: null,
        rate_source: null,
        is_chomesh: isChomesh,
      };

      if (values.currency !== settings.defaultCurrency && values.conversion_rate) {
        const conversionRate = values.conversion_rate;
        const originalSignedAmount =
          values.balanceType === "debt" ? values.amount : -values.amount;
        const convertedMagnitude = Number((values.amount * conversionRate).toFixed(2));
        finalAmount = values.balanceType === "debt" ? convertedMagnitude : -convertedMagnitude;

        transactionPayload.amount = finalAmount;
        transactionPayload.original_amount = originalSignedAmount;
        transactionPayload.original_currency = values.currency;
        transactionPayload.conversion_rate = conversionRate;
        transactionPayload.conversion_date =
          values.conversion_date || new Date().toISOString().split("T")[0];
        transactionPayload.rate_source = values.rate_source;
      }

      if (resolvedTransaction) {
        if (onUpdate) {
          await onUpdate(resolvedTransaction.id, transactionPayload);
        } else {
          await updateTransaction(
            resolvedTransaction.id,
            transactionPayload as TransactionUpdatePayload
          );
        }
        toast.success(tCommon("toast.settings.saveSuccess"));
        onClose();
        return;
      }

      // Opening balance uses a slim payload shape; TransactionFormValues is wider
      await handleTransactionSubmit({
        type: "initial_balance",
        date: new Date().toISOString().split("T")[0],
        description: t("balanceManagement.openingBalanceButton"),
        category: "",
        is_chomesh: isChomesh,
        recipient: "",
        isExempt: false,
        isRecognized: false,
        isFromPersonalFunds: false,
        is_recurring: false,
        ...transactionPayload,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- narrow opening-balance payload vs full form type
      } as any);

      toast.success(tCommon("toast.settings.saveSuccess"));
      onClose();
    } catch (error) {
      logger.error("Failed to set opening balance:", error);
      toast.error(tCommon("toast.settings.saveError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid gap-4 py-2"
        dir={layoutDir}
      >
        <OpeningBalanceHomeStyleStatCard />

        <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
          {trackChomeshSeparately && (
            <FormField
              control={form.control}
              name="balancePot"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>{t("balanceManagement.potLabel")}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      dir={layoutDir}
                      className="flex flex-row flex-wrap justify-center gap-3"
                    >
                      <div className="flex min-h-0 min-w-[100px] max-w-[180px] flex-1 basis-0">
                        <RadioGroupItem
                          value="maaser"
                          id="ob-maaser"
                          className="peer sr-only"
                        />
                        <Label htmlFor="ob-maaser" className="block w-full cursor-pointer">
                          <ToggleChoiceCard
                            selected={field.value === "maaser"}
                            variant="primary"
                          >
                            {t("balanceManagement.potMaaser")}
                          </ToggleChoiceCard>
                        </Label>
                      </div>
                      <div className="flex min-h-0 min-w-[100px] max-w-[180px] flex-1 basis-0">
                        <RadioGroupItem
                          value="chomesh"
                          id="ob-chomesh"
                          className="peer sr-only"
                        />
                        <Label htmlFor="ob-chomesh" className="block w-full cursor-pointer">
                          <ToggleChoiceCard
                            selected={field.value === "chomesh"}
                            variant="golden"
                            showGoldenBubbles={false}
                          >
                            {t("balanceManagement.potChomesh")}
                          </ToggleChoiceCard>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className={`${OPENING_BALANCE_TOGGLE_ROW_MAX_CLASS} space-y-3`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
              <div className="min-w-0 flex-1">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("balanceManagement.amountLabel")}</FormLabel>
                      <div className={FIELD_MESSAGE_OUTER_CLASS}>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              className="text-start"
                            />
                          </FormControl>
                          <div className="absolute start-0 top-full mt-1 w-full">
                            <FormMessage />
                          </div>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <div className="w-full shrink-0 sm:w-[7.5rem]">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <div className="h-6 max-sm:hidden" aria-hidden="true" />
                      <div className={FIELD_MESSAGE_OUTER_CLASS}>
                        <div className="relative">
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CURRENCIES.map((currency) => (
                                <SelectItem key={currency.code} value={currency.code}>
                                  {currency.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="absolute start-0 top-full mt-1 w-full">
                            <FormMessage />
                          </div>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <CurrencyConversionSection
              form={form as unknown as UseFormReturn<TransactionFormValues>}
              selectedCurrency={form.watch("currency")}
              amount={form.watch("amount")}
              className="mt-0"
            />
          </div>

          <FormField
            control={form.control}
            name="balanceType"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                    dir={layoutDir}
                    className="flex flex-row flex-wrap justify-center gap-3"
                  >
                    <div className="flex min-h-0 min-w-[100px] max-w-[180px] flex-1 basis-0">
                      <RadioGroupItem
                        value="debt"
                        id="debt"
                        className="peer sr-only"
                      />
                      <Label htmlFor="debt" className="block w-full cursor-pointer">
                        <ToggleChoiceCard
                          selected={field.value === "debt"}
                          variant="danger"
                        >
                          <span className="text-base font-bold">{t("balanceManagement.debtLabel")}</span>
                        </ToggleChoiceCard>
                      </Label>
                    </div>
                    <div className="flex min-h-0 min-w-[100px] max-w-[180px] flex-1 basis-0">
                      <RadioGroupItem
                        value="credit"
                        id="credit"
                        className="peer sr-only"
                      />
                      <Label htmlFor="credit" className="block w-full cursor-pointer">
                        <ToggleChoiceCard
                          selected={field.value === "credit"}
                          variant="success"
                        >
                          <span className="text-base font-bold">{t("balanceManagement.creditLabel")}</span>
                        </ToggleChoiceCard>
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );

  const footerContent = (
    <div className="flex w-full justify-end gap-3">
      <Button variant="outline" onClick={onClose} type="button">
        {t("balanceManagement.cancelButton")}
      </Button>
      <Button onClick={form.handleSubmit(handleSubmit)} disabled={isSubmitting} type="submit">
        {isSubmitting ? t("balanceManagement.saveButton") + "..." : t("balanceManagement.saveButton")}
      </Button>
    </div>
  );

  if (useDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-lg"
          dir={layoutDir}
          style={{ direction: layoutDir }}
        >
          <div
            className="flex flex-col gap-4"
            dir={layoutDir}
            style={{ direction: layoutDir }}
          >
            <DialogHeader className="pe-10">
              <DialogTitle>
                {initialData != null || resolvedTransaction != null
                  ? t("modal.editTitle", { ns: "data-tables" })
                  : t("balanceManagement.modalTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("balanceManagement.modalDescription")}
              </DialogDescription>
            </DialogHeader>

            {formContent}

            <DialogFooter>{footerContent}</DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent dir={layoutDir} style={{ direction: layoutDir }}>
        <DrawerHeader className="text-start">
          <DrawerTitle>
            {initialData != null || resolvedTransaction != null
              ? t("modal.editTitle", { ns: "data-tables" })
              : t("balanceManagement.modalTitle")}
          </DrawerTitle>
          <DrawerDescription>
            {t("balanceManagement.modalDescription")}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4">{formContent}</div>

        <DrawerFooter className="pt-2">{footerContent}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
