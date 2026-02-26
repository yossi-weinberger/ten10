import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock, KeyRound, ShieldCheck, Info } from "lucide-react";
import {
  isDesktopLockEnabled,
  isUnlocked,
  setupLock,
  disableLock,
  lockNow,
  generateRecoveryKey,
  changePassword,
} from "@/lib/security/appLock.service";
import {
  validateChangePassword,
  validatePasswordPair,
} from "@/lib/security/appLockPasswordSchema";
import { logger } from "@/lib/logger";
import { useDonationStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import toast from "react-hot-toast";

const AUTO_LOCK_OPTIONS = [
  { value: 0, labelKey: "autoLockOff" },
  { value: 5, labelKey: "autoLock5" },
  { value: 10, labelKey: "autoLock10" },
  { value: 15, labelKey: "autoLock15" },
  { value: 30, labelKey: "autoLock30" },
] as const;

export function AppLockSettingsCard() {
  const { t, i18n } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");
  const { settings, updateSettings } = useDonationStore(
    useShallow((s) => ({
      settings: s.settings,
      updateSettings: s.updateSettings,
    })),
  );
  const [lockEnabled, setLockEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enableDialogOpen, setEnableDialogOpen] = useState(false);
  const [changePwDialogOpen, setChangePwDialogOpen] = useState(false);
  const [recoveryKeyDialogOpen, setRecoveryKeyDialogOpen] = useState(false);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [displayRecoveryKey, setDisplayRecoveryKey] = useState("");
  const [enablePassword, setEnablePassword] = useState("");
  const [enableConfirm, setEnableConfirm] = useState("");
  const [changeOldPw, setChangeOldPw] = useState("");
  const [changeNewPw, setChangeNewPw] = useState("");
  const [changeNewPwConfirm, setChangeNewPwConfirm] = useState("");

  useEffect(() => {
    isDesktopLockEnabled().then(setLockEnabled);
  }, []);

  const autoLockValue = settings.autoLockTimeoutMinutes ?? 10;
  const autoLockIndex = AUTO_LOCK_OPTIONS.findIndex(
    (opt) => opt.value === autoLockValue,
  );
  const currentAutoLockIndex = autoLockIndex === -1 ? 2 : autoLockIndex;
  const currentAutoLockOption = AUTO_LOCK_OPTIONS[currentAutoLockIndex];

  const setAutoLockTimeout = (value: number) => {
    updateSettings({ autoLockTimeoutMinutes: value });
  };

  const stepAutoLockTimeout = (delta: -1 | 1) => {
    const nextIndex = Math.min(
      AUTO_LOCK_OPTIONS.length - 1,
      Math.max(0, currentAutoLockIndex + delta),
    );
    setAutoLockTimeout(AUTO_LOCK_OPTIONS[nextIndex].value);
  };

  const handleEnableSubmit = async () => {
    const validation = validatePasswordPair({
      password: enablePassword,
      confirmPassword: enableConfirm,
    });
    if (!validation.success && validation.error === "too_short") {
      toast.error(t("appLock.passwordMinLength"));
      return;
    }
    if (!validation.success && validation.error === "mismatch") {
      toast.error(t("appLock.passwordsDoNotMatch"));
      return;
    }
    setLoading(true);
    try {
      const { recoveryKey } = await setupLock(enablePassword);
      setEnablePassword("");
      setEnableConfirm("");
      setEnableDialogOpen(false);
      setDisplayRecoveryKey(recoveryKey);
      setRecoveryKeyDialogOpen(true);
      setLockEnabled(true);
    } catch (e) {
      logger.error("Enable app lock failed", e);
      toast.error(t("appLock.enableLockError"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await disableLock();
      setLockEnabled(false);
      toast.success(t("appLock.lockDisabled"));
    } catch (e) {
      logger.error("Disable app lock failed", e);
      toast.error(t("appLock.disableLockError"));
    } finally {
      setLoading(false);
    }
  };

  const handleLockNow = () => {
    lockNow();
    window.location.replace("/");
  };

  const handleChangePasswordSubmit = async () => {
    const validation = validateChangePassword({
      oldPassword: changeOldPw,
      newPassword: changeNewPw,
      confirmNewPassword: changeNewPwConfirm,
    });
    if (!validation.success && validation.error === "too_short") {
      toast.error(t("appLock.passwordMinLength"));
      return;
    }
    if (!validation.success && validation.error === "mismatch") {
      toast.error(t("appLock.passwordsDoNotMatch"));
      return;
    }
    setLoading(true);
    try {
      await changePassword(changeOldPw, changeNewPw);
      setChangeOldPw("");
      setChangeNewPw("");
      setChangeNewPwConfirm("");
      setChangePwDialogOpen(false);
      toast.success(t("appLock.changePasswordSuccess"));
    } catch (e) {
      logger.error("Change app lock password failed", e);
      toast.error(t("appLock.changePasswordError"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateRecoveryKey = async () => {
    setRegenerateConfirmOpen(false);
    setLoading(true);
    try {
      const key = await generateRecoveryKey();
      setDisplayRecoveryKey(key);
      setRecoveryKeyDialogOpen(true);
      toast.success(t("appLock.regenerateSuccess"));
    } catch (e) {
      logger.error("Regenerate recovery key failed", e);
      toast.error(t("appLock.regenerateError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <div>
              <div className="flex items-center gap-1.5">
                <CardTitle>{t("appLock.cardTitle")}</CardTitle>
                <TooltipProvider>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label={t("appLock.securityNoteTitle")}
                      >
                        <Info className="h-4 w-4 shrink-0 cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="max-w-sm text-xs bg-popover text-popover-foreground border shadow-md p-3"
                    >
                      <div dir={i18n.dir()} className="grid gap-1 text-start">
                        <p className="font-semibold text-foreground border-b pb-1 mb-1">
                          {t("appLock.securityNoteTitle")}
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>{t("appLock.securityNoteProtected")}</li>
                          <li>{t("appLock.securityNoteNotEncrypted")}</li>
                          <li>{t("appLock.securityNoteRecommendations")}</li>
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <CardDescription>{t("appLock.cardDescription")}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0" dir={i18n.dir()}>
            <Switch
              checked={lockEnabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  setEnableDialogOpen(true);
                } else {
                  setDisableConfirmOpen(true);
                }
              }}
            />
          </div>
        </div>
      </CardHeader>
      {!lockEnabled ? null : (
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLockNow}
              disabled={!isUnlocked()}
            >
              <Lock className="h-4 w-4" />
              {t("appLock.lockNow")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChangePwDialogOpen(true)}
              disabled={!isUnlocked()}
            >
              <KeyRound className="h-4 w-4" />
              {t("appLock.changePassword")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRegenerateConfirmOpen(true)}
              disabled={!isUnlocked() || loading}
            >
              <ShieldCheck className="h-4 w-4" />
              {t("appLock.regenerateRecoveryKey")}
            </Button>
            <div
              className="flex items-center gap-2 ms-auto shrink-0"
              dir={i18n.dir()}
            >
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                {t("appLock.autoLockTimeout")}
              </Label>
              <div className="inline-flex items-center rounded-md border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-none px-2"
                  onClick={() => stepAutoLockTimeout(-1)}
                  disabled={currentAutoLockIndex <= 0}
                >
                  -
                </Button>
                <div className="px-3 text-sm whitespace-nowrap">
                  {t(`appLock.${currentAutoLockOption.labelKey}`)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-none px-2"
                  onClick={() => stepAutoLockTimeout(1)}
                  disabled={
                    currentAutoLockIndex >= AUTO_LOCK_OPTIONS.length - 1
                  }
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}

      {/* Disable confirmation */}
      <AlertDialog
        open={disableConfirmOpen}
        onOpenChange={setDisableConfirmOpen}
      >
        <AlertDialogContent dir={i18n.dir()}>
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle className="text-start">
              {t("appLock.disableConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              {t("appLock.disableConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("appLock.disableLock")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate recovery key confirmation */}
      <AlertDialog
        open={regenerateConfirmOpen}
        onOpenChange={setRegenerateConfirmOpen}
      >
        <AlertDialogContent dir={i18n.dir()}>
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle className="text-start">
              {t("appLock.regenerateWarningTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              {t("appLock.regenerateWarningDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegenerateRecoveryKey}
              disabled={loading}
            >
              {t("appLock.regenerateRecoveryKey")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={enableDialogOpen} onOpenChange={setEnableDialogOpen}>
        <DialogContent dir={i18n.dir()} className="sm:max-w-md">
          <DialogHeader className="text-start">
            <DialogTitle className="text-start">
              {t("appLock.enableLock")}
            </DialogTitle>
            <DialogDescription className="text-start">
              {t("appLock.enableDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("appLock.passwordPlaceholder")}</Label>
              <Input
                type="password"
                value={enablePassword}
                onChange={(e) => setEnablePassword(e.target.value)}
                placeholder={t("appLock.passwordPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("appLock.confirmPasswordPlaceholder")}</Label>
              <Input
                type="password"
                value={enableConfirm}
                onChange={(e) => setEnableConfirm(e.target.value)}
                placeholder={t("appLock.confirmPasswordPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              variant="outline"
              onClick={() => setEnableDialogOpen(false)}
            >
              {tCommon("actions.cancel")}
            </Button>
            <Button
              onClick={handleEnableSubmit}
              disabled={loading || !enablePassword || !enableConfirm}
            >
              {t("appLock.enableLock")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changePwDialogOpen} onOpenChange={setChangePwDialogOpen}>
        <DialogContent dir={i18n.dir()} className="sm:max-w-md">
          <DialogHeader className="text-start">
            <DialogTitle className="text-start">
              {t("appLock.changePassword")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("appLock.currentPassword")}</Label>
              <Input
                type="password"
                value={changeOldPw}
                onChange={(e) => setChangeOldPw(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("appLock.newPassword")}</Label>
              <Input
                type="password"
                value={changeNewPw}
                onChange={(e) => setChangeNewPw(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("appLock.confirmNewPassword")}</Label>
              <Input
                type="password"
                value={changeNewPwConfirm}
                onChange={(e) => setChangeNewPwConfirm(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              variant="outline"
              onClick={() => setChangePwDialogOpen(false)}
            >
              {tCommon("actions.cancel")}
            </Button>
            <Button
              onClick={handleChangePasswordSubmit}
              disabled={
                loading || !changeOldPw || !changeNewPw || !changeNewPwConfirm
              }
            >
              {t("appLock.updatePassword")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={recoveryKeyDialogOpen}
        onOpenChange={setRecoveryKeyDialogOpen}
      >
        <DialogContent dir={i18n.dir()} className="sm:max-w-md">
          <DialogHeader className="text-start">
            <DialogTitle className="text-start">
              {t("appLock.recoveryKeyDialogTitle")}
            </DialogTitle>
            <DialogDescription className="text-start">
              {t("appLock.recoveryKeyDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/50 p-3 font-mono text-sm break-all select-all">
            {displayRecoveryKey}
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(displayRecoveryKey);
                toast.success(t("appLock.keyCopied"));
              }}
            >
              {t("appLock.copyKey")}
            </Button>
            <Button onClick={() => setRecoveryKeyDialogOpen(false)}>
              {t("appLock.done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
