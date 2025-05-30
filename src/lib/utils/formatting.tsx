import { Check } from "lucide-react";

export const formatBoolean = (
  value: boolean | null | undefined
): React.ReactNode => {
  if (value === true) {
    return <Check className="h-4 w-4 text-green-600" />;
  }
  return null;
};

export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}
