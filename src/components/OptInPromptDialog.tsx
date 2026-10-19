import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDonationStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
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
import { buildReminderProfileUpdate } from "@/lib/services/preferences-sync.service";

const STORAGE_KEY_PREFIX = "ten10_opt_in_prompt_shown_";
const NEW_USER_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 1 day

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function hasPromptBeenShown(userId: string): boolean {
  try {
    return localStorage.getItem(getStorageKey(userId)) === "true";
  } catch {
    return false;
  }
}

function markPromptAsShown(userId: string): void {
  try {
    localStorage.setItem(getStorageKey(userId), "true");
  } catch (error) {
    logger.error("Failed to mark opt-in prompt as shown:", error);
  }
}

async function isNewUser(): Promise<boolean> {
  try {
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData?.user?.created_at) return false;
    
    const createdAt = new Date(userData.user.created_at).getTime();
    const now = Date.now();
    return (now - createdAt) < NEW_USER_GRACE_PERIOD_MS;
  } catch {
    return false;
  }
}

export function OptInPromptDialog() {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const { platform } = usePlatform();
  const { settings, updateSettings, _hasHydrated } = useDonationStore();

  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isNewUserState, setIsNewUserState] = useState(true); // Assume new until verified

  // Check if user is brand new
  useEffect(() => {
    if (user) {
      isNewUser().then(setIsNewUserState);
    }
  }, [user]);

  // Derive checkbox state from loaded server settings (no sync needed)
  const enableRemindersInitial = _hasHydrated ? settings.reminderEnabled === true : false;
  const enableMarketingInitial = _hasHydrated ? settings.mailingListConsent === true : false;

  const [enableReminders, setEnableReminders] = useState(enableRemindersInitial);
  const [enableMarketing, setEnableMarketing] = useState(enableMarketingInitial);

  // Compute whether dialog should be shown
  const shouldShow = useMemo(() => {
    // Wait for store to hydrate from server
    if (!_hasHydrated) {
      return false;
    }

    if (platform !== "web" || !user || dismissed || isNewUserState) {
      return false;
    }

    if (hasPromptBeenShown(user.id)) {
      return false;
    }

    // Show only if at least ONE field is enabled (user is engaged) AND at least ONE is disabled
    // This avoids showing to users who deliberately unsubscribed from everything via email
    const hasReminderEnabled = settings.reminderEnabled === true;
    const hasMarketingEnabled = settings.mailingListConsent === true;
    const hasAtLeastOneEnabled = hasReminderEnabled || hasMarketingEnabled;
    const hasAtLeastOneDisabled = !hasReminderEnabled || !hasMarketingEnabled;

    return hasAtLeastOneEnabled && hasAtLeastOneDisabled;
  }, [_hasHydrated, user, platform, settings.reminderEnabled, settings.mailingListConsent, dismissed, isNewUserState]);

  const handleNotNow = () => {
    if (user) {
      markPromptAsShown(user.id);
    }
    setDismissed(true);
  };

  const handleDismiss = () => {
    handleNotNow();
  };

  const handleUpdate = async () => {
    if (!user) return;

    setIsUpdating(true);
    try {
      // Only update fields that changed from their loaded server values
      const updates: Partial<typeof settings> = {};
      
      if (enableReminders !== (settings.reminderEnabled === true)) {
        updates.reminderEnabled = enableReminders;
        updates.notifications = enableReminders;
      }
      
      if (enableMarketing !== (settings.mailingListConsent === true)) {
        updates.mailingListConsent = enableMarketing;
      }

      // Update local settings
      updateSettings(updates);

      // Update Supabase
      const profileUpdate = buildReminderProfileUpdate({
        ...settings,
        ...updates,
      });
      const { error } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      markPromptAsShown(user.id);
      setDismissed(true);
      toast.success(t("toast.settings.updateSuccess"));
    } catch (error) {
      logger.error("Failed to update opt-in preferences:", error);
      toast.error(t("toast.settings.updateError"));
    } finally {
      setIsUpdating(false);
    }
  };

  const needsReminder = settings.reminderEnabled === false;
  const needsMarketing = settings.mailingListConsent === false;

  return (
    <Dialog open={shouldShow} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>{t("optInPrompt.title")}</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {t("optInPrompt.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {needsReminder && (
            <div className="flex items-start space-x-3 rtl:space-x-reverse">
              <Checkbox
                id="enable-reminders"
                checked={enableReminders}
                onCheckedChange={(checked) =>
                  setEnableReminders(checked as boolean)
                }
                disabled={isUpdating}
                className="mt-1"
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="enable-reminders"
                  className="text-sm font-medium cursor-pointer"
                >
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
                onCheckedChange={(checked) =>
                  setEnableMarketing(checked as boolean)
                }
                disabled={isUpdating}
                className="mt-1"
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="enable-marketing"
                  className="text-sm font-medium cursor-pointer"
                >
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
            onClick={handleNotNow}
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
            {isUpdating
              ? t("optInPrompt.updating")
              : t("optInPrompt.updatePreferences")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
