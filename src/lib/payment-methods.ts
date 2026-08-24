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

type PaymentMethodLabels = Record<"en" | "he", string>;

const PAYMENT_METHOD_OFFICIAL_LABELS: Record<
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

export type PaymentMethodOption = {
  value: string;
  label: string;
  keywords: string[];
};

export function isPredefinedPaymentMethod(
  value: string | null | undefined
): value is PaymentMethodKey {
  return !!value && PAYMENT_METHOD_KEYS.includes(value as PaymentMethodKey);
}

export function normalizePaymentMethodValue(
  value: string | null | undefined
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return (
    PAYMENT_METHOD_ALIAS_MAP.get(trimmed.toLowerCase()) ?? trimmed
  );
}

export function getPaymentMethodAliases(value: string): string[] {
  const normalized = normalizePaymentMethodValue(value);
  if (!normalized) {
    return [];
  }

  if (!isPredefinedPaymentMethod(normalized)) {
    return [normalized];
  }

  const labels = PAYMENT_METHOD_OFFICIAL_LABELS[normalized];
  return Array.from(new Set([normalized, labels.en, labels.he]));
}

export function expandPaymentMethodFilterAliases(
  values: readonly string[]
): string[] {
  return Array.from(
    new Set(values.flatMap((value) => getPaymentMethodAliases(value)))
  );
}

export function mergePaymentMethodOptions(
  predefinedOptions: readonly PaymentMethodOption[],
  userMethods: readonly string[],
  locale?: string
): PaymentMethodOption[] {
  const seenIdentities = new Set<string>();
  const mergedPredefined: PaymentMethodOption[] = [];

  for (const option of predefinedOptions) {
    const normalizedValue = normalizePaymentMethodValue(option.value);
    if (!normalizedValue) {
      continue;
    }

    const identity = isPredefinedPaymentMethod(normalizedValue)
      ? `predefined:${normalizedValue}`
      : `custom:${normalizedValue}`;

    if (!seenIdentities.has(identity)) {
      seenIdentities.add(identity);
      mergedPredefined.push({
        value: normalizedValue,
        label: option.label,
        keywords: Array.from(
          new Set([
            ...option.keywords,
            ...getPaymentMethodAliases(normalizedValue),
          ])
        ),
      });
    }
  }

  const customOptions: PaymentMethodOption[] = [];
  for (const rawMethod of userMethods) {
    const normalizedValue = normalizePaymentMethodValue(rawMethod);
    if (!normalizedValue) {
      continue;
    }

    const identity = isPredefinedPaymentMethod(normalizedValue)
      ? `predefined:${normalizedValue}`
      : `custom:${normalizedValue}`;

    if (seenIdentities.has(identity)) {
      continue;
    }

    seenIdentities.add(identity);
    const option = {
      value: normalizedValue,
      label: normalizedValue,
      keywords: [normalizedValue],
    };
    customOptions.push(option);
  }

  customOptions.sort((a, b) => a.label.localeCompare(b.label, locale));
  return [...mergedPredefined, ...customOptions];
}

export function formatPaymentMethod(
  value: string | null | undefined,
  currentLanguage: string,
  fallback: string = ""
): string {
  const normalized = normalizePaymentMethodValue(value);
  if (!normalized) {
    return fallback;
  }
  if (isPredefinedPaymentMethod(normalized)) {
    return (
      i18n.t(`transactionForm.paymentMethod.options.${normalized}`, {
        lng: currentLanguage,
        ns: "transactions",
      }) || normalized
    );
  }
  return normalized;
}
