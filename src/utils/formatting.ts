export const formatBoolean = (value: boolean | null | undefined): string => {
  if (value === true) return "כן";
  if (value === false) return "לא";
  return "-";
};

export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}
