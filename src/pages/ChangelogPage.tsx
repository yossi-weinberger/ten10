import { Link } from "@tanstack/react-router";
import {
  ArrowDownUp,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  CreditCard,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Globe2,
  HardDrive,
  Languages,
  LayoutDashboard,
  Library,
  Lock,
  Megaphone,
  MessageSquare,
  MonitorCog,
  MousePointerClick,
  PieChart,
  RefreshCw,
  Repeat,
  Settings,
  ShieldCheck,
  Tags,
  TableProperties,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  whatsNewHistory,
} from "@/lib/whats-new-history";

const itemIcons: Record<string, LucideIcon> = {
  recurringBillingDay: Repeat,
  homeFeedback: MessageSquare,
  toastRefresh: Megaphone,
  landingPolish: LayoutDashboard,
  spreadsheetImport: FileSpreadsheet,
  guidedWizard: TableProperties,
  safeReview: ClipboardCheck,
  backupImport: ArrowDownUp,
  duplicateDetection: CheckCircle2,
  financialDashboard: LayoutDashboard,
  pdfExport: FileText,
  separateChomesh: PieChart,
  settingsSaving: Settings,
  recurringFixes: Repeat,
  paymentMethod: CreditCard,
  desktopLock: Lock,
  desktopImprovements: MonitorCog,
  categories: Tags,
  manualOpen: MousePointerClick,
  responsiveLayout: LayoutDashboard,
  modal: Megaphone,
  currencyAndBalance: Coins,
  stability: ShieldCheck,
  currencyConversion: Coins,
  defaultCurrency: Globe2,
  localizedFormatting: Languages,
  openingBalance: LayoutDashboard,
  autoChomesh: PieChart,
  recurringPage: Repeat,
  recurringEditing: Settings,
  recurringDesktop: HardDrive,
  halachaLibrary: Library,
  halachaContent: FileText,
  bilingualInterface: Languages,
  localizedDashboard: LayoutDashboard,
  monthlyReminders: CalendarDays,
  desktopNotifications: Megaphone,
  desktopPersistence: Database,
  importExportBackup: ArrowDownUp,
  desktopUpdates: Download,
  releaseManagement: RefreshCw,
};

function formatReleaseDate(date: string) {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

export function ChangelogPage() {
  const { t, i18n } = useTranslation("changelog");
  const latestChangelogVersion = whatsNewHistory[0]?.version;

  return (
    <div className="grid gap-6" dir={i18n.dir()}>
      <header className="grid gap-1">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <div className="space-y-4">
        {whatsNewHistory.map((release) => (
          <Card key={release.version}>
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">v{release.version}</Badge>
                    {release.version === latestChangelogVersion && (
                      <Badge>{t("current")}</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">
                    {t(`releases.${release.translationKey}.title`)}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <time dateTime={release.date}>
                    {formatReleaseDate(release.date)}
                  </time>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {release.itemKeys.map((itemKey) => {
                  const ItemIcon = itemIcons[itemKey] ?? CheckCircle2;

                  return (
                    <li key={itemKey} className="flex gap-3">
                      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ItemIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          {t(
                            `releases.${release.translationKey}.items.${itemKey}.title`,
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t(
                            `releases.${release.translationKey}.items.${itemKey}.description`,
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Button asChild variant="outline">
          <Link to="/settings">{t("backToSettings")}</Link>
        </Button>
      </div>
    </div>
  );
}
