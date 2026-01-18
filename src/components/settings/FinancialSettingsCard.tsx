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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Calculator, Percent, AlertTriangle, Coins } from "lucide-react";
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
  onOpenBalanceModal?: () => void;
}

export function FinancialSettingsCard({
  financialSettings,
  updateSettings,
  disableAutoCalcChomesh = false,
  disableMinMaaserPercentage = false,
  onOpenBalanceModal,
}: FinancialSettingsCardProps) {
  const { t } = useTranslation("settings");

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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <div className="grid gap-2 p-2">
            <Label>{t("financial.defaultCurrencyLabel")}</Label>
            <div className="flex items-center gap-4 ">
              <Button
                variant={
                  financialSettings.defaultCurrency === "ILS"
                    ? "default"
                    : "outline"
                }
                onClick={() => updateSettings({ defaultCurrency: "ILS" })}
                className="h-16 w-16 flex flex-col items-center justify-center gap-1"
              >
                <span className="text-xl font-bold">₪</span>
                <span className="text-xs">
                  {t("financial.currencyNameILS")}
                </span>
              </Button>
              <Button
                variant={
                  financialSettings.defaultCurrency === "USD"
                    ? "default"
                    : "outline"
                }
                onClick={() => updateSettings({ defaultCurrency: "USD" })}
                className="h-16 w-16 flex flex-col items-center justify-center gap-1"
              >
                <span className="text-xl font-bold">$</span>
                <span className="text-xs">
                  {t("financial.currencyNameUSD")}
                </span>
              </Button>
              <Button
                variant={
                  financialSettings.defaultCurrency === "EUR"
                    ? "default"
                    : "outline"
                }
                onClick={() => updateSettings({ defaultCurrency: "EUR" })}
                className="h-16 w-16 flex flex-col items-center justify-center gap-1"
              >
                <span className="text-xl font-bold">€</span>
                <span className="text-xs">
                  {t("financial.currencyNameEUR")}
                </span>
              </Button>
            </div>
          </div>
          <Alert variant="destructive" className="mt-2 xl:mt-0">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("financial.currencyWarning.title")}</AlertTitle>
            <AlertDescription>
              {t("financial.currencyWarning.description")}
            </AlertDescription>
          </Alert>
        </div>יש בעיו

        {/* Opening Balance Button */}
        {onOpenBalanceModal && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <Label>{t("balanceManagement.title")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("balanceManagement.description")}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={onOpenBalanceModal}>
              {t("balanceManagement.openingBalanceButton")}
            </Button>
          </div>
        )}

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
