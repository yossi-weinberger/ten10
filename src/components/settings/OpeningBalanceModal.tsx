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
  const [amount, setAmount] = useState<string>("");
  const [balanceType, setBalanceType] = useState<"debt" | "credit">("debt");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isDesktopQuery = useMediaQuery("(min-width: 768px)");
  const [useDesktop, setUseDesktop] = useState(isDesktopQuery);

  // Reset or populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setAmount(Math.abs(initialData.amount).toString());
        setBalanceType(initialData.amount >= 0 ? "debt" : "credit");
      } else {
        setAmount("");
        setBalanceType("debt");
      }
      setIsSubmitting(false);
    }
  }, [isOpen, initialData]);

  // Lock the variant (Drawer/Dialog) when the modal is open
  useEffect(() => {
    if (!isOpen) setUseDesktop(isDesktopQuery);
  }, [isDesktopQuery, isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error(t("messages.invalidAmount")); // Fallback if key missing, ensure "messages" exists in settings or use common
      return;
    }

    setIsSubmitting(true);
    try {
      // Logic:
      // Debt = Positive amount (adds to obligation)
      // Credit = Negative amount (reduces obligation)
      const finalAmount =
        balanceType === "debt" ? parseFloat(amount) : -parseFloat(amount);

      if (initialData && onUpdate) {
        await onUpdate(initialData.id, {
          amount: finalAmount,
        });
        toast.success(tCommon("toast.settings.saveSuccess"));
        onClose();
        return;
      }

      await handleTransactionSubmit({
        type: "initial_balance",
        amount: finalAmount, // Allow negative amounts for credit
        currency: settings.defaultCurrency,
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
    <div className="grid gap-4 py-4">
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

      <div className="grid gap-2">
        <Label htmlFor="amount">{t("balanceManagement.amountLabel")}</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <RadioGroup
        value={balanceType}
        onValueChange={(val) => setBalanceType(val as "debt" | "credit")}
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
    </div>
  );

  const footerContent = (
    <div className="flex gap-3 w-full justify-end">
      <Button variant="outline" onClick={onClose} type="button">
        {t("balanceManagement.cancelButton")}
      </Button>
      <Button onClick={() => handleSubmit()} disabled={isSubmitting} type="submit">
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
