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

// Define the specific settings properties needed by this component
interface NotificationSettings {
  notifications: boolean;
  recurringDonations: boolean;
}

interface NotificationSettingsCardProps {
  notificationSettings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
}

export function NotificationSettingsCard({
  notificationSettings,
  updateSettings,
}: NotificationSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          <CardTitle>התראות ותזכורות</CardTitle>
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
          />
        </div>
      </CardContent>
    </Card>
  );
}
