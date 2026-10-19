import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ARRIVAL_CODE_MAX_LENGTH, sanitizeArrivalCodeInput } from "@/lib/attribution/arrival-code";

type ArrivalCodeFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  namespace?: "auth" | "onboarding";
};

export function ArrivalCodeField({
  id = "arrival-code",
  value,
  onChange,
  disabled,
  namespace = "auth",
}: ArrivalCodeFieldProps) {
  const { t } = useTranslation(namespace);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("arrivalCode.label")}</Label>
      <Input
        id={id}
        name="arrival-code"
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        dir="ltr"
        maxLength={ARRIVAL_CODE_MAX_LENGTH}
        value={value}
        onChange={(event) => onChange(sanitizeArrivalCodeInput(event.target.value))}
        placeholder={t("arrivalCode.placeholder")}
        disabled={disabled}
        className="h-11 bg-muted/30"
      />
    </div>
  );
}
