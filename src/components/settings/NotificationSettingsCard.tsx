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
import { BellRing, Bell, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Define the specific settings properties needed by this component
interface NotificationSettings {
  notifications: boolean;
  recurringDonations: boolean;
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
  return (
    <Card className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          <CardTitle>התראות ותזכורות</CardTitle>
          {disabled && (
            <Badge
              variant="outline"
              className="ml-auto text-amber-600 border-amber-600 dark:text-amber-500 dark:border-amber-500"
            >
              בקרוב
            </Badge>
          )}
        </div>
        <CardDescription>הגדרות התראות ותזכורות</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <Label>התראות</Label>
              <p className="text-sm text-muted-foreground">
                קבל התראות על תרומות ותשלומים
              </p>
            </div>
          </div>
          <Switch
            checked={notificationSettings.notifications}
            onCheckedChange={(checked) =>
              updateSettings({ notifications: checked })
            }
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <Label>תזכורות לתרומות קבועות</Label>
              <p className="text-sm text-muted-foreground">
                קבל תזכורות על תרומות קבועות
              </p>
            </div>
          </div>
          <Switch
            checked={notificationSettings.recurringDonations}
            onCheckedChange={(checked) =>
              updateSettings({ recurringDonations: checked })
            }
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
