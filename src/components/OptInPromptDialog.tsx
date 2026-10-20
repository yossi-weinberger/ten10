import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDonationStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { markOptInPromptAsShown, hasOptInPromptBeenShown } from "@/lib/optInPrompt";

const NEW_USER_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

function isNewUser(createdAt: string): boolean {
  const createdAtTime = new Date(createdAt).getTime();
  const now = Date.now();
  return (now - createdAtTime) < NEW_USER_GRACE_PERIOD_MS;
}

export function OptInPromptDialog() {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const { platform } = usePlatform();
  const { settings, updateSettings, _hasHydrated } = useDonationStore();
  const [dismissed, setDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [enableReminders, setEnableReminders] = useState(false);
  const [enableMarketing, setEnableMarketing] = useState(false);

  const needsReminder = !settings.reminderEnabled;
  const needsMarketing = !settings.mailingListConsent;
  const isNewUserCheck = user?.created_at ? isNewUser(user.created_at) : true;

  const shouldShow = _hasHydrated && 
    platform === "web" && 
    user && 
    !dismissed && 
    !isNewUserCheck &&
    !hasOptInPromptBeenShown(user.id) &&
    (needsReminder || needsMarketing);

  if (!_hasHydrated || !user) {
    return null;
  }

  const markShown = () => markOptInPromptAsShown(user.id);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const updates: Partial<typeof settings> = {};
      const profileUpdates: Record<string, boolean | number> = {};
      
      if (needsReminder) {
        updates.reminderEnabled = enableReminders;
        updates.notifications = enableReminders;
        profileUpdates.reminder_enabled = enableReminders;
        profileUpdates.notifications = enableReminders;
      }
      
      if (needsMarketing) {
        updates.mailingListConsent = enableMarketing;
        profileUpdates.mailing_list_consent = enableMarketing;
      }

      if (Object.keys(updates).length === 0) {
        markShown();
        setDismissed(true);
        return;
      }

      updateSettings(updates);

      const { error } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", user.id);

      if (error) throw error;

      markShown();
      setDismissed(true);
    } catch (error) {
      logger.error("Failed to update opt-in preferences:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    markShown();
    setDismissed(true);
  };

  return (
    <Dialog open={!!shouldShow} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>{t("optInPrompt.title")}</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {needsReminder
              ? t("optInPrompt.descriptionReminder")
              : t("optInPrompt.descriptionMarketing")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {needsReminder && (
            <div className="flex items-start space-x-3 rtl:space-x-reverse">
              <Checkbox
                id="enable-reminders"
                checked={enableReminders}
                onCheckedChange={(checked) => setEnableReminders(!!checked)}
                disabled={isUpdating}
                className="mt-1"
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="enable-reminders" className="text-sm font-medium cursor-pointer">
                  {t("optInPrompt.reminderLabel")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("optInPrompt.reminderDescription")}
                </p>
              </div>
            </div>
          )}

          {needsMarketing && (
            <div className="flex items-start space-x-3 rtl:space-x-reverse">
              <Checkbox
                id="enable-marketing"
                checked={enableMarketing}
                onCheckedChange={(checked) => setEnableMarketing(!!checked)}
                disabled={isUpdating}
                className="mt-1"
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="enable-marketing" className="text-sm font-medium cursor-pointer">
                  {t("optInPrompt.marketingLabel")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("optInPrompt.marketingDescription")}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isUpdating}
            className="w-full sm:w-auto"
          >
            {t("optInPrompt.notNow")}
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="w-full sm:w-auto"
          >
            {isUpdating ? t("optInPrompt.updating") : t("optInPrompt.updatePreferences")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
