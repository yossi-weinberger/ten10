import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { ParsedUserRule, RuleActionType } from "@/lib/ai/classify-intake";
import { ChoiceRow } from "./ChoiceRow";

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
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {rule.name}
          <Badge variant="secondary">{t(`aiIntake.types.${type}`)}</Badge>
        </CardTitle>
        <CardDescription>
          {t("aiIntake.ruleSentence", { name: rule.name, type: t(`aiIntake.types.${type}`) })}
        </CardDescription>
      </CardHeader>
      {interactive ? (
        <CardFooter>
          <Button type="button" className="w-fit" disabled={saving} onClick={onApprove}>
            {saving ? <Spinner /> : null}
            {t("aiIntake.ruleApprove")}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
