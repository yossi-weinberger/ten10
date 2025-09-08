import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BellRing, Mail, Monitor, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePlatform } from "@/contexts/PlatformContext";
import {
  enableAutostart,
  disableAutostart,
  isAutostartEnabled,
} from "@/lib/data-layer/autostart.service";

// Define the specific settings properties needed by this component
interface NotificationSettings {
  notifications: boolean;
  recurringDonations: boolean;
  reminderEnabled: boolean;
  reminderDayOfMonth: 1 | 10 | 15 | 20;
}

interface NotificationSettingsCardProps {
  notificationSettings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  disabled?: boolean;
}

export function NotificationSettingsCard({
  notificationSettings,
  updateSettings,
  disabled = false,
}: NotificationSettingsCardProps) {
  const { t } = useTranslation("settings");
  const { platform } = usePlatform();
  const [autostartStatus, setAutostartStatus] = useState(false);

  const isWeb = platform === "web";
  const isDesktop = platform === "desktop";

  useEffect(() => {
    if (isDesktop) {
      isAutostartEnabled().then(setAutostartStatus);
    }
  }, [isDesktop]);

  const handleDayChange = (day: 1 | 10 | 15 | 20) => {
    updateSettings({
      reminderDayOfMonth: day,
    });
  };

  const handleAutostartChange = async (enabled: boolean) => {
    if (enabled) {
      await enableAutostart();
    } else {
      await disableAutostart();
    }
    setAutostartStatus(enabled);
  };

  return (
    <Card className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          <CardTitle>{t("notifications.cardTitle")}</CardTitle>
          {disabled && (
            <Badge
              variant="outline"
              className="ml-auto text-amber-600 border-amber-600 dark:text-amber-500 dark:border-amber-500"
            >
              {t("notifications.comingSoon")}
            </Badge>
          )}
        </div>
        <CardDescription>{t("notifications.cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* Platform-specific Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border">
              {isWeb ? (
                <Mail className="h-5 w-5" />
              ) : (
                <Monitor className="h-5 w-5" />
              )}
            </div>
            <div>
              <Label>
                {isWeb
                  ? t("notifications.emailNotificationsLabel")
                  : t("notifications.desktopNotificationsLabel")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {isWeb
                  ? t("notifications.emailNotificationsDescription")
                  : t("notifications.desktopNotificationsDescription")}
              </p>
            </div>
          </div>
          <Switch
            checked={notificationSettings.notifications}
            onCheckedChange={(checked) =>
              updateSettings({
                notifications: checked,
                reminderEnabled: checked, // Also update reminder enabled when notifications change
              })
            }
            disabled={disabled}
          />
        </div>

        {/* Day Selection - Always visible but disabled when notifications are off */}
        <div className="ml-11 space-y-2">
          <Label className="text-sm">
            {t("notifications.reminderDayLabel")}
          </Label>
          <div className="flex gap-2">
            {([1, 10, 15, 20] as const).map((day) => (
              <button
                key={day}
                onClick={() => handleDayChange(day)}
                disabled={disabled || !notificationSettings.notifications}
                className={`
                  px-3 py-2 text-sm font-medium rounded-md border transition-colors
                  ${
                    notificationSettings.reminderDayOfMonth === day
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                  }
                  ${
                    disabled || !notificationSettings.notifications
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }
                `}
              >
                {t(`notifications.day${day}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Autostart Toggle - Desktop only */}
        {isDesktop && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border">
                <Power className="h-5 w-5" />
              </div>
              <div>
                <Label>{t("notifications.autostartLabel")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.autostartDescription")}
                </p>
              </div>
            </div>
            <Switch
              checked={autostartStatus}
              onCheckedChange={handleAutostartChange}
              disabled={disabled}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
