import { BadgeCheck } from "lucide-react";

export const formatBoolean = (
  value: boolean | null | undefined
): React.ReactNode => {
  if (value === true) {
    return (
      <div className="flex justify-center items-center">
        <BadgeCheck className="h-5 w-5 text-green-600" />
      </div>
    );
  }
  return "-";
};
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}
