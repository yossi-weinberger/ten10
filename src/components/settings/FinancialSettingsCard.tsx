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
import { Badge } from "@/components/ui/badge";

// Define the specific settings properties needed by this component
interface FinancialSettings {
  defaultCurrency: "ILS" | "USD" | "EUR";
  autoCalcChomesh: boolean;
  minMaaserPercentage?: number;
}

interface FinancialSettingsCardProps {
  financialSettings: FinancialSettings;
  updateSettings: (newSettings: Partial<FinancialSettings>) => void;
  disableAutoCalcChomesh?: boolean;
  disableMinMaaserPercentage?: boolean;
}

export function FinancialSettingsCard({
  financialSettings,
  updateSettings,
  disableAutoCalcChomesh = false,
  disableMinMaaserPercentage = false,
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
              <Label htmlFor="autoCalcChomeshSwitch">חישוב חומש אוטומטי</Label>
              <p className="text-sm text-muted-foreground">
                חשב אוטומטית את החומש בהכנסות חדשות
              </p>
              {disableAutoCalcChomesh && (
                <Badge
                  variant="outline"
                  className="mt-1 text-amber-600 border-amber-600 dark:text-amber-500 dark:border-amber-500"
                >
                  בקרוב
                </Badge>
              )}
            </div>
          </div>
          <Switch
            id="autoCalcChomeshSwitch"
            checked={financialSettings.autoCalcChomesh}
            onCheckedChange={(checked) =>
              updateSettings({ autoCalcChomesh: checked })
            }
            disabled={disableAutoCalcChomesh}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <Label htmlFor="minMaaserPercentageInput">
                אחוז מעשר מינימלי
              </Label>
              <p className="text-sm text-muted-foreground">
                הגדר אחוז מינימלי לתרומה מכל הכנסה
              </p>
              {disableMinMaaserPercentage && (
                <Badge
                  variant="outline"
                  className="mt-1 text-amber-600 border-amber-600 dark:text-amber-500 dark:border-amber-500"
                >
                  בקרוב
                </Badge>
              )}
            </div>
          </div>
          <Input
            id="minMaaserPercentageInput"
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
            disabled={disableMinMaaserPercentage}
          />
        </div>
      </CardContent>
    </Card>
  );
}
