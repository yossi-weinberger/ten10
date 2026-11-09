import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KIND_TINT } from "./card-style";
import { KindTag } from "./KindTag";

export function HalachaCard({ namespace }: { namespace: string }) {
  const { t } = useTranslation([
    "navigation",
    "halacha-expenses",
    "halacha-income",
    "halacha-chomesh",
    "halacha-tithes",
  ]);
  return (
    <Card className="grid gap-2 p-2.5">
      <div className="flex">
        <KindTag icon={BookOpen} tint={KIND_TINT.knowledge}>{t("aiIntake.halachaTag")}</KindTag>
      </div>
      <blockquote className="text-sm leading-relaxed">{t("introduction.body", { ns: namespace })}</blockquote>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t("aiIntake.halachaPersonal")}</span>
        <Button asChild variant="outline" size="sm" className="ms-auto">
          <Link to="/halacha">
            <BookOpen aria-hidden />
            {t("aiIntake.halachaLink")}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
