import { useState, useEffect } from "react";
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
import { markOptInPromptAsShown, hasOptInPromptBeenShown } from "@/lib/optInPrompt";

const NEW_USER_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

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
  const [dismissed, setDismissed] = useState(false);
  const [isNewUserState, setIsNewUserState] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const initialReminder = settings.reminderEnabled === true;
  const initialMarketing = settings.mailingListConsent === true;
  const [enableReminders, setEnableReminders] = useState(initialReminder);
  const [enableMarketing, setEnableMarketing] = useState(initialMarketing);

  useEffect(() => {
    if (user) {
      isNewUser().then(setIsNewUserState);
    }
  }, [user]);

  const needsReminder = !initialReminder;
  const needsMarketing = !initialMarketing;

  const shouldShow = _hasHydrated && 
    platform === "web" && 
    user && 
    !dismissed && 
    !isNewUserState &&
    !hasOptInPromptBeenShown(user.id) &&
    (initialReminder || initialMarketing) &&
    (!initialReminder || !initialMarketing);

  if (!_hasHydrated || !user) {
    return null;
  }

  const markShown = () => markOptInPromptAsShown(user.id);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const updates: Partial<typeof settings> = {};
      
      if (enableReminders !== initialReminder) {
        updates.reminderEnabled = enableReminders;
        updates.notifications = enableReminders;
      }
      
      if (enableMarketing !== initialMarketing) {
        updates.mailingListConsent = enableMarketing;
      }

      if (Object.keys(updates).length === 0) {
        markShown();
        setDismissed(true);
        return;
      }

      updateSettings(updates);

      const profileUpdate = buildReminderProfileUpdate({
        ...settings,
        ...updates,
      });
      const { error } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user.id);

      if (error) throw error;

      markShown();
      setDismissed(true);
      toast.success(t("toast.settings.updateSuccess"));
    } catch (error) {
      logger.error("Failed to update opt-in preferences:", error);
      toast.error(t("toast.settings.updateError"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    markShown();
    setDismissed(true);
  };

  const checkboxes: Array<{
    id: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description: string;
  }> = [];
  
  if (needsReminder) {
    checkboxes.push({
      id: "enable-reminders",
      checked: enableReminders,
      onChange: setEnableReminders,
      label: t("optInPrompt.reminderLabel"),
      description: t("optInPrompt.reminderDescription"),
    });
  }
  
  if (needsMarketing) {
    checkboxes.push({
      id: "enable-marketing",
      checked: enableMarketing,
      onChange: setEnableMarketing,
      label: t("optInPrompt.marketingLabel"),
      description: t("optInPrompt.marketingDescription"),
    });
  }

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
          {checkboxes.map((checkbox) => (
            <div key={checkbox.id} className="flex items-start space-x-3 rtl:space-x-reverse">
              <Checkbox
                id={checkbox.id}
                checked={checkbox.checked}
                onCheckedChange={(checked) => checkbox.onChange(!!checked)}
                disabled={isUpdating}
                className="mt-1"
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor={checkbox.id} className="text-sm font-medium cursor-pointer">
                  {checkbox.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {checkbox.description}
                </p>
              </div>
            </div>
          ))}
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
