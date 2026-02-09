import i18n from "@/lib/i18n";

export const PAYMENT_METHOD_KEYS = [
  "cash",
  "credit_card",
  "debit_card",
  "bank_transfer",
  "check",
  "bit_paybox",
  "paypal",
  "other",
] as const;

export const PAYMENT_METHOD_PRIORITY = [
  "credit_card",
  "cash",
  "bank_transfer",
  "debit_card",
  "check",
  "bit_paybox",
  "paypal",
  "other",
] as const;

export type PaymentMethodKey = (typeof PAYMENT_METHOD_KEYS)[number];

export function isPredefinedPaymentMethod(
  value: string | null | undefined
): value is PaymentMethodKey {
  return !!value && PAYMENT_METHOD_KEYS.includes(value as PaymentMethodKey);
}

export function formatPaymentMethod(
  value: string | null | undefined,
  currentLanguage: string,
  fallback: string = ""
): string {
  if (!value) {
    return fallback;
  }
  if (isPredefinedPaymentMethod(value)) {
    return (
      i18n.t(`transactionForm.paymentMethod.options.${value}`, {
        lng: currentLanguage,
        ns: "transactions",
      }) || value
    );
  }
  return value;
}
