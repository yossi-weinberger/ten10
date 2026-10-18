import i18n from "@/lib/i18n";
import {
  isPredefinedPaymentMethod,
  normalizePaymentMethodValue,
  PAYMENT_METHOD_OFFICIAL_LABELS,
} from "../../supabase/functions/_shared/transaction-domain/payment-method-keys.ts";

export {
  isPredefinedPaymentMethod,
  normalizePaymentMethodValue,
  PAYMENT_METHOD_KEYS,
  PAYMENT_METHOD_PRIORITY,
  type PaymentMethodKey,
} from "../../supabase/functions/_shared/transaction-domain/payment-method-keys.ts";

export type PaymentMethodOption = {
  value: string;
  label: string;
  keywords: string[];
};

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
  values: readonly string[],
  observedRawValues: readonly string[] = []
): string[] {
  const selectedCanonicalIdentities = new Set<string>();
  for (const value of values) {
    const normalizedValue = normalizePaymentMethodValue(value);
    if (normalizedValue) {
      selectedCanonicalIdentities.add(normalizedValue);
    }
  }

  const aliases = values.flatMap((value) => getPaymentMethodAliases(value));
  for (const rawValue of observedRawValues) {
    const normalizedValue = normalizePaymentMethodValue(rawValue);
    if (
      normalizedValue &&
      selectedCanonicalIdentities.has(normalizedValue)
    ) {
      aliases.push(rawValue);
    }
  }

  return Array.from(new Set(aliases));
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
