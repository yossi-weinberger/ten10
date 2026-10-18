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

type PaymentMethodLabels = Record<"en" | "he", string>;

export const PAYMENT_METHOD_OFFICIAL_LABELS: Record<
  PaymentMethodKey,
  PaymentMethodLabels
> = {
  cash: { en: "Cash", he: "מזומן" },
  credit_card: { en: "Credit card", he: "כרטיס אשראי" },
  debit_card: { en: "Debit card", he: "כרטיס דביט" },
  bank_transfer: { en: "Bank transfer", he: "העברה בנקאית" },
  check: { en: "Check", he: "צ׳ק" },
  bit_paybox: { en: "Bit/PayBox", he: "ביט/פייבוקס" },
  paypal: { en: "PayPal", he: "PayPal" },
  other: { en: "Other", he: "אחר" },
};

const PAYMENT_METHOD_ALIAS_MAP = new Map<string, PaymentMethodKey>();

for (const key of PAYMENT_METHOD_KEYS) {
  PAYMENT_METHOD_ALIAS_MAP.set(key.toLowerCase(), key);
  const labels = PAYMENT_METHOD_OFFICIAL_LABELS[key];
  PAYMENT_METHOD_ALIAS_MAP.set(labels.en.toLowerCase(), key);
  PAYMENT_METHOD_ALIAS_MAP.set(labels.he.toLowerCase(), key);
}

export function isPredefinedPaymentMethod(
  value: string | null | undefined,
): value is PaymentMethodKey {
  return !!value && PAYMENT_METHOD_KEYS.includes(value as PaymentMethodKey);
}

export function normalizePaymentMethodValue(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return PAYMENT_METHOD_ALIAS_MAP.get(trimmed.toLowerCase()) ?? trimmed;
}
