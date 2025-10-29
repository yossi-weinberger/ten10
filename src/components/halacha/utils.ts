// Utility functions for halacha components

export function getTypedTranslation<T>(
  t: (key: string, options?: { returnObjects: boolean }) => any,
  key: string,
  defaultValue: T
): T {
  const result = t(key, { returnObjects: true });
  if (
    typeof result === "object" &&
    result !== null &&
    Object.keys(result).length > 0
  ) {
    return result as T;
  }
  return defaultValue;
}
