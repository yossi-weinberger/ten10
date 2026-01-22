import { useState, useEffect } from "react";
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
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/currency";
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
import { CURRENCIES } from "@/lib/currencies";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CurrencyConversionSection } from "@/components/forms/transaction-form-parts/CurrencyConversionSection";

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
  const { serverCalculatedTitheBalance, settings } = useDonationStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isDesktopQuery = useMediaQuery("(min-width: 768px)");
  const [useDesktop, setUseDesktop] = useState(isDesktopQuery);

  const formSchema = z.object({
    amount: z.coerce.number().positive(),
    balanceType: z.enum(["debt", "credit"]),
    currency: z.enum(["ILS", "USD", "EUR", "CAD", "GBP", "AUD", "CHF", "ARS", "BRL", "ZAR", "MXN", "UAH"]),
    conversion_rate: z.number().optional(),
    conversion_date: z.string().optional(),
    rate_source: z.enum(["auto", "manual"]).optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: initialData ? Math.abs(initialData.amount) : undefined,
      balanceType: initialData ? (initialData.amount >= 0 ? "debt" : "credit") : "debt",
      currency: settings.defaultCurrency as any,
    },
  });

  // Reset or populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          amount: Math.abs(initialData.amount),
          balanceType: initialData.amount >= 0 ? "debt" : "credit",
          currency: settings.defaultCurrency as any, // Initial balance usually in default currency, but could be different if we support it
        });
      } else {
        form.reset({
          amount: undefined,
          balanceType: "debt",
          currency: settings.defaultCurrency as any,
        });
      }
      setIsSubmitting(false);
    }
  }, [isOpen, initialData, form, settings.defaultCurrency]);

  // Lock the variant (Drawer/Dialog) when the modal is open
  useEffect(() => {
    if (!isOpen) setUseDesktop(isDesktopQuery);
  }, [isDesktopQuery, isOpen]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Logic:
      // Debt = Positive amount (adds to obligation)
      // Credit = Negative amount (reduces obligation)
      
      let finalAmount = values.balanceType === "debt" ? values.amount : -values.amount;
      
      // Handle Currency Conversion Logic
      if (values.currency !== settings.defaultCurrency && values.conversion_rate) {
          const conversionRate = values.conversion_rate;
          // Apply conversion to the magnitude, sign remains from balanceType
          const convertedMagnitude = Number((Math.abs(finalAmount) * conversionRate).toFixed(2));
          finalAmount = values.balanceType === "debt" ? convertedMagnitude : -convertedMagnitude;
      }

      if (initialData && onUpdate) {
        await onUpdate(initialData.id, {
          amount: finalAmount,
        });
        toast.success(tCommon("toast.settings.saveSuccess"));
        onClose();
        return;
      }

      const transactionPayload: any = {
        type: "initial_balance",
        amount: finalAmount, // Allow negative amounts for credit
        currency: settings.defaultCurrency, // Always save in default currency
        date: new Date().toISOString().split("T")[0],
        description: t("balanceManagement.openingBalanceButton"),
        // Defaults
        category: "",
        is_chomesh: false,
        recipient: "",
        isExempt: false,
        isRecognized: false,
        isFromPersonalFunds: false,
        is_recurring: false,
      };

      // Add conversion fields if applicable
      if (values.currency !== settings.defaultCurrency && values.conversion_rate) {
          transactionPayload.original_amount = values.balanceType === "debt" ? values.amount : -values.amount;
          transactionPayload.original_currency = values.currency;
          transactionPayload.conversion_rate = values.conversion_rate;
          transactionPayload.conversion_date = values.conversion_date || new Date().toISOString().split("T")[0];
          transactionPayload.rate_source = values.rate_source;
      }

      await handleTransactionSubmit(transactionPayload);

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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
      <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg">
        <span className="text-sm font-medium text-muted-foreground">
          {t("balanceManagement.currentBalance")}
        </span>
        <span
          className={`text-2xl font-bold ${
            (serverCalculatedTitheBalance || 0) > 0
              ? "text-destructive"
              : "text-emerald-600"
          }`}
        >
          {formatCurrency(
            serverCalculatedTitheBalance || 0,
            settings.defaultCurrency,
            settings.language
          )}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 items-end">
        <div className="col-span-2">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("balanceManagement.amountLabel")}</FormLabel>
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div>
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>&nbsp;</FormLabel> {/* Spacer */}
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Currency Conversion Section */}
      <CurrencyConversionSection
        form={form as any} // Cast to any to bypass strict type check for now, or define a compatible partial type
        selectedCurrency={form.watch("currency")}
        amount={form.watch("amount")}
      />

      <FormField
        control={form.control}
        name="balanceType"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="debt"
                    id="debt"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="debt"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-red-50 hover:text-red-900 hover:border-red-200 peer-data-[state=checked]:border-red-600 peer-data-[state=checked]:bg-red-50 peer-data-[state=checked]:text-red-900 cursor-pointer transition-all dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:peer-data-[state=checked]:bg-red-950/50 dark:peer-data-[state=checked]:text-red-400"
                  >
                    <span className="font-bold text-lg">{t("balanceManagement.debtLabel")}</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="credit"
                    id="credit"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="credit"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-green-50 hover:text-green-900 hover:border-green-200 peer-data-[state=checked]:border-green-600 peer-data-[state=checked]:bg-green-50 peer-data-[state=checked]:text-green-900 cursor-pointer transition-all dark:hover:bg-green-950/30 dark:hover:text-green-400 dark:peer-data-[state=checked]:bg-green-950/50 dark:peer-data-[state=checked]:text-green-400"
                  >
                    <span className="font-bold text-lg">{t("balanceManagement.creditLabel")}</span>
                  </Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      </form>
    </Form>
  );

  const footerContent = (
    <div className="flex gap-3 w-full justify-end">
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="pr-10 rtl:pl-10">
            <DialogTitle>
              {initialData ? t("modal.editTitle", { ns: "data-tables" }) : t("balanceManagement.modalTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("balanceManagement.modalDescription")}
            </DialogDescription>
          </DialogHeader>
          
          {formContent}

          <DialogFooter>
            {footerContent}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader className="text-start">
          <DrawerTitle>
            {initialData ? t("modal.editTitle", { ns: "data-tables" }) : t("balanceManagement.modalTitle")}
          </DrawerTitle>
          <DrawerDescription>
            {t("balanceManagement.modalDescription")}
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="px-4">
          {formContent}
        </div>

        <DrawerFooter className="pt-2">
          {footerContent}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
