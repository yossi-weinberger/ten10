import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  setupLock,
  unlock,
  verifyRecoveryKey,
  resetVaultWithNewPassword,
  removeVaultAndRecoveryKeyOnly,
} from "@/lib/security/appLock.service";
import { clearAllData } from "@/lib/data-layer";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { logger } from "@/lib/logger";
import AppLoader from "@/components/layout/AppLoader";

type ScreenMode =
  | "unlock"
  | "setup"
  | "setup-recovery-key"
  | "forgot-recovery"
  | "reset";

export interface DesktopLockScreenProps {
  isFirstTime: boolean;
  onUnlocked: () => void;
}

const formInputClass = "h-11 bg-muted/30";
const formButtonClass = "w-full h-11 text-base";

export function DesktopLockScreen({
  isFirstTime,
  onUnlocked,
}: DesktopLockScreenProps) {
  const { t, i18n } = useTranslation("appLock");
  const { t: tCommon } = useTranslation("common");
  const [mode, setMode] = useState<ScreenMode>(
    isFirstTime ? "setup" : "unlock",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [displayRecoveryKey, setDisplayRecoveryKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullResetDialogOpen, setFullResetDialogOpen] = useState(false);
  const [fullResetLoading, setFullResetLoading] = useState(false);
  const [recoveryKeyCopiedFeedback, setRecoveryKeyCopiedFeedback] =
    useState(false);

  async function handleUnlock() {
    setError(null);
    setLoading(true);
    try {
      await unlock(password);
      onUnlocked();
    } catch (e) {
      logger.error("App lock unlock failed", e);
      setError(t("errorWrongPassword"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup() {
    setError(null);
    if (!password.trim() || !confirmPassword.trim()) {
      setError(t("errorPasswordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("errorPasswordMismatch"));
      return;
    }
    setLoading(true);
    try {
      const { recoveryKey: key } = await setupLock(password);
      setDisplayRecoveryKey(key);
      setMode("setup-recovery-key");
    } catch (e) {
      logger.error("App lock setup failed", e);
      setError(t("errorWrongPassword"));
    } finally {
      setLoading(false);
    }
  }

  function handleRecoveryKeySaved() {
    setDisplayRecoveryKey("");
    setMode("unlock");
    setPassword("");
    setConfirmPassword("");
    onUnlocked();
  }

  async function handleRecoverWithKey() {
    setError(null);
    setLoading(true);
    try {
      const ok = await verifyRecoveryKey(recoveryKey.trim());
      if (!ok) {
        setError(t("errorInvalidRecoveryKey"));
        return;
      }
      setMode("reset");
      setRecoveryKey("");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetAndSetNew() {
    setError(null);
    if (!password.trim() || !confirmPassword.trim()) {
      setError(t("errorPasswordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("errorPasswordMismatch"));
      return;
    }
    setLoading(true);
    try {
      const { recoveryKey: key } = await resetVaultWithNewPassword(password);
      setDisplayRecoveryKey(key);
      setMode("setup-recovery-key");
    } catch (e) {
      logger.error("App lock reset failed", e);
      setError(t("errorWrongPassword"));
    } finally {
      setLoading(false);
    }
  }

  async function handleFullResetConfirm() {
    setFullResetLoading(true);
    try {
      await clearAllData();
      await removeVaultAndRecoveryKeyOnly();
      setFullResetDialogOpen(false);
      window.location.replace("/");
    } catch (e) {
      logger.error("Full reset failed", e);
      setError(t("errorWrongPassword"));
      setFullResetLoading(false);
    }
  }

  if (loading) {
    return <AppLoader />;
  }

  if (mode === "setup-recovery-key") {
    return (
      <AuthLayout
        title={t("recoveryKeyTitle")}
        subtitle={t("recoveryKeyDescription")}
        showHomeButton={false}
      >
        <div className="space-y-6 text-center">
          <div className="rounded-lg border bg-muted/50 p-4 font-mono text-sm break-all select-all text-start">
            {displayRecoveryKey}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="secondary"
              className={formButtonClass}
              onClick={async () => {
                await navigator.clipboard.writeText(displayRecoveryKey);
                setRecoveryKeyCopiedFeedback(true);
                setTimeout(() => setRecoveryKeyCopiedFeedback(false), 2000);
              }}
            >
              {recoveryKeyCopiedFeedback ? t("keyCopied") : t("copyKey")}
            </Button>
            <Button
              onClick={handleRecoveryKeySaved}
              className={formButtonClass}
            >
              {t("continueButton")}
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (mode === "forgot-recovery") {
    return (
      <AuthLayout
        title={t("recoveryKeyTitle")}
        subtitle={t("recoveryKeyHint")}
        showHomeButton={false}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="recovery-key">{t("recoveryKeyPlaceholder")}</Label>
            <Input
              id="recovery-key"
              type="text"
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
              placeholder={t("recoveryKeyPlaceholder")}
              className={`font-mono ${formInputClass}`}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className={`flex-1 ${formButtonClass}`}
              onClick={() => {
                setMode("unlock");
                setRecoveryKey("");
                setError(null);
              }}
            >
              {tCommon("actions.cancel")}
            </Button>
            <Button
              className={`flex-1 ${formButtonClass}`}
              onClick={handleRecoverWithKey}
              disabled={loading || !recoveryKey.trim()}
            >
              {t("recoverButton")}
            </Button>
          </div>
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline w-full text-center"
            onClick={() => setFullResetDialogOpen(true)}
          >
            {t("fullResetLink")}
          </button>
        </div>

        <AlertDialog
          open={fullResetDialogOpen}
          onOpenChange={setFullResetDialogOpen}
        >
          <AlertDialogContent dir={i18n.dir()}>
            <AlertDialogHeader className="text-start">
              <AlertDialogTitle className="text-start">
                {t("fullResetConfirmTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-start">
                {t("fullResetConfirmDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:space-x-0">
              <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleFullResetConfirm}
                disabled={fullResetLoading}
                className="bg-destructive hover:bg-destructive/90"
              >
                {fullResetLoading
                  ? tCommon("labels.loading")
                  : t("fullResetButton")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AuthLayout>
    );
  }

  if (mode === "reset") {
    return (
      <AuthLayout
        title={t("resetTitle")}
        subtitle={t("resetSubtitle")}
        showHomeButton={false}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("passwordPlaceholder")}</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder")}
                className={formInputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-confirm">
                {t("confirmPasswordPlaceholder")}
              </Label>
              <Input
                id="new-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("confirmPasswordPlaceholder")}
                className={formInputClass}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className={formButtonClass}
            onClick={handleResetAndSetNew}
            disabled={loading || !password.trim() || !confirmPassword.trim()}
          >
            {t("resetButton")}
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (mode === "setup") {
    return (
      <AuthLayout
        title={t("setupTitle")}
        subtitle={t("setupSubtitle")}
        showHomeButton={false}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setup-password">{t("passwordPlaceholder")}</Label>
              <Input
                id="setup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder")}
                className={formInputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-confirm">
                {t("confirmPasswordPlaceholder")}
              </Label>
              <Input
                id="setup-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("confirmPasswordPlaceholder")}
                className={formInputClass}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className={formButtonClass}
            onClick={handleSetup}
            disabled={loading || !password.trim() || !confirmPassword.trim()}
          >
            {t("setupButton")}
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t("title")}
      subtitle={t("subtitle")}
      showHomeButton={false}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="unlock-password">{t("passwordPlaceholder")}</Label>
          <Input
            id="unlock-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            className={formInputClass}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUnlock();
            }}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          className={formButtonClass}
          onClick={handleUnlock}
          disabled={loading || !password}
        >
          {t("unlockButton")}
        </Button>
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline w-full text-center"
          onClick={() => {
            setMode("forgot-recovery");
            setError(null);
            setRecoveryKey("");
          }}
        >
          {t("forgotPassword")}
        </button>
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
          onClick={() => setFullResetDialogOpen(true)}
        >
          {t("fullResetLink")}
        </button>
      </div>

      <AlertDialog
        open={fullResetDialogOpen}
        onOpenChange={setFullResetDialogOpen}
      >
        <AlertDialogContent dir={i18n.dir()}>
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle className="text-start">
              {t("fullResetConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              {t("fullResetConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFullResetConfirm}
              disabled={fullResetLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {fullResetLoading
                ? tCommon("labels.loading")
                : t("fullResetButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthLayout>
  );
}
