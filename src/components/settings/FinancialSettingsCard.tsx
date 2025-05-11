import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Wallet, Calculator, Percent } from "lucide-react";

// Define the specific settings properties needed by this component
interface FinancialSettings {
  defaultCurrency: "ILS" | "USD" | "EUR";
  autoCalcChomesh: boolean;
  minMaaserPercentage?: number;
}

interface FinancialSettingsCardProps {
  financialSettings: FinancialSettings;
  updateSettings: (newSettings: Partial<FinancialSettings>) => void;
}

export function FinancialSettingsCard({
  financialSettings,
  updateSettings,
}: FinancialSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <CardTitle>הגדרות כספים</CardTitle>
        </div>
        <CardDescription>הגדרות מטבע וחישובים</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label>מטבע ברירת מחדל</Label>
          <Select
            value={financialSettings.defaultCurrency}
            onValueChange={(value) =>
              updateSettings({
                defaultCurrency: value as "ILS" | "USD" | "EUR",
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר מטבע" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ILS">₪ שקל</SelectItem>
              <SelectItem value="USD">$ דולר</SelectItem>
              <SelectItem value="EUR">€ יורו</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <Label>חישוב חומש אוטומטי</Label>
              <p className="text-sm text-muted-foreground">
                חשב אוטומטית את החומש בהכנסות חדשות
              </p>
            </div>
          </div>
          <Switch
            checked={financialSettings.autoCalcChomesh}
            onCheckedChange={(checked) =>
              updateSettings({ autoCalcChomesh: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <Label>אחוז מעשר מינימלי</Label>
              <p className="text-sm text-muted-foreground">
                הגדר אחוז מינימלי לתרומה מכל הכנסה
              </p>
            </div>
          </div>
          <Input
            type="number"
            min="0"
            max="100"
            className="w-20 text-left"
            value={financialSettings.minMaaserPercentage}
            onChange={(e) =>
              updateSettings({
                minMaaserPercentage: parseInt(e.target.value, 10) || 0,
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
