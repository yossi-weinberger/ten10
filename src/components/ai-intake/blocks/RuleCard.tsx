import { ArrowLeft, ListChecks } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { ParsedUserRule, RuleActionType } from "@/lib/ai/classify-intake";
import { ChoiceRow } from "./ChoiceRow";
import { KIND_TINT } from "./card-style";
import { KindTag } from "./KindTag";
import { TypeTag } from "./TypeTag";

export function RuleCard({
  rule,
  choice,
  interactive,
  saving,
  onChoose,
  onApprove,
}: {
  rule: ParsedUserRule;
  choice: RuleActionType | null;
  interactive: boolean;
  saving: boolean;
  onChoose: (type: RuleActionType) => void;
  onApprove: () => void;
}) {
  const { t } = useTranslation("navigation");
  if (rule.action === "ambiguous" && !choice) {
    return (
      <ChoiceRow
        prompt={t("aiIntake.askRule")}
        disabled={!interactive}
        onChoose={onChoose}
        options={(["exempt-income", "recognized-expense", "non_tithe_donation"] as const).map((type) => ({
          value: type,
          label: t(`aiIntake.types.${type}`),
        }))}
      />
    );
  }

  const type = choice ?? rule.action;
  return (
    <Card className="grid gap-2 p-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <KindTag icon={ListChecks} tint={KIND_TINT.knowledge}>{t("aiIntake.ruleTag")}</KindTag>
        <span className="text-xs text-muted-foreground">{t("aiIntake.ruleNewOnly")}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
          <span className="font-medium">{rule.name}</span>
          {/* Points forward in either direction: left in Hebrew, right in English. */}
          <ArrowLeft className="size-3.5 text-muted-foreground ltr:rotate-180" aria-hidden />
          {type !== "ambiguous" ? <TypeTag type={type} variant="compact" /> : null}
        </p>
        {interactive ? (
          <Button type="button" size="sm" className="ms-auto" disabled={saving} onClick={onApprove}>
            {saving ? <Spinner /> : null}
            {t("aiIntake.ruleApprove")}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
