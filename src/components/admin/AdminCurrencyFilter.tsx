import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface AdminCurrencyFilterProps {
  currencies: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function AdminCurrencyFilter({
  currencies,
  selected,
  onChange,
}: AdminCurrencyFilterProps) {
  if (currencies.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {currencies.map((code) => {
        const id = `admin-currency-${code}`;
        const checked = selected.includes(code);
        return (
          <div key={code} className="flex items-center gap-2">
            <Checkbox
              id={id}
              checked={checked}
              onCheckedChange={(state) => {
                if (state === true) {
                  onChange([...selected, code]);
                } else {
                  onChange(selected.filter((item) => item !== code));
                }
              }}
            />
            <Label htmlFor={id} className="cursor-pointer font-medium">
              {code}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
