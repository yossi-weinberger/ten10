import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import { showAiIntakeUi } from "@/lib/ai/flags";
import { disableUserRule, listActiveUserRules } from "@/lib/ai/user-rules";
import type { ActiveUserRule } from "@/lib/ai/classify-intake";

export function AiRulesSettingsCard() {
  const { t } = useTranslation(["settings", "navigation"]);
  const { platform } = usePlatform();
  const { session } = useAuth();
  const enabled = showAiIntakeUi(platform, Boolean(session?.user));
  const [rules, setRules] = useState<ActiveUserRule[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void listActiveUserRules().then((next) => {
      if (cancelled) return;
      setRules(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled) return null;

  async function handleDisable(rule: ActiveUserRule) {
    setBusyName(rule.name);
    setMessage(null);
    const disabled = await disableUserRule(rule.name, rule.type);
    setBusyName(null);
    if (!disabled) {
      setMessage(t("aiRules.disableFailed"));
      return;
    }
    setRules((current) => current.filter((item) => item.name !== rule.name || item.type !== rule.type));
    setMessage(t("aiRules.disabled"));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("aiRules.cardTitle")}</CardTitle>
        <CardDescription>{t("aiRules.cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loading ? <p className="text-sm text-muted-foreground">{t("aiRules.loading")}</p> : null}
        {!loading && rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("aiRules.empty")}</p>
        ) : null}
        {rules.map((rule) => (
          <div key={`${rule.type}:${rule.name}`} className="flex items-center justify-between gap-3">
            <p className="text-sm">
              {rule.name} · {t(`aiIntake.types.${rule.type}`, { ns: "navigation" })}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={busyName === rule.name}
              onClick={() => void handleDisable(rule)}
            >
              {t("aiRules.disable")}
            </Button>
          </div>
        ))}
        {message ? <p className="text-sm">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
