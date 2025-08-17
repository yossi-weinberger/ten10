import React from "react";
import { useTranslation } from "react-i18next";
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
import { Wallet, Calculator, Percent, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const { t, i18n } = useTranslation("settings");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <CardTitle>{t("financial.cardTitle")}</CardTitle>
        </div>
        <CardDescription>{t("financial.cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label>{t("financial.defaultCurrencyLabel")}</Label>
          <Select
            value={financialSettings.defaultCurrency}
            onValueChange={(value) =>
              updateSettings({
                defaultCurrency: value as "ILS" | "USD" | "EUR",
              })
            }
            dir={i18n.dir()}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("financial.currencyPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ILS">{t("financial.currencyILS")}</SelectItem>
              <SelectItem value="USD">{t("financial.currencyUSD")}</SelectItem>
              <SelectItem value="EUR">{t("financial.currencyEUR")}</SelectItem>
            </SelectContent>
          </Select>
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("financial.currencyWarning.title")}</AlertTitle>
            <AlertDescription>
              {t("financial.currencyWarning.description")}
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <Label htmlFor="autoCalcChomeshSwitch">
                {t("financial.autoCalcChomeshLabel")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("financial.autoCalcChomeshDescription")}
              </p>
              {disableAutoCalcChomesh && (
                <Badge
                  variant="outline"
                  className="mt-1 text-amber-600 border-amber-600 dark:text-amber-500 dark:border-amber-500"
                >
                  {t("financial.comingSoon")}
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
                {t("financial.minMaaserPercentageLabel")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("financial.minMaaserPercentageDescription")}
              </p>
              {disableMinMaaserPercentage && (
                <Badge
                  variant="outline"
                  className="mt-1 text-amber-600 border-amber-600 dark:text-amber-500 dark:border-amber-500"
                >
                  {t("financial.comingSoon")}
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
