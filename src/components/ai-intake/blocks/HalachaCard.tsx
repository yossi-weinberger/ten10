import { BookOpen, Quote } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function HalachaCard({ namespace }: { namespace: string }) {
  const { t } = useTranslation([
    "navigation",
    "halacha-expenses",
    "halacha-income",
    "halacha-chomesh",
    "halacha-tithes",
  ]);
  return (
    <figure className="rounded-xl bg-primary/5 p-4">
      <Quote className="size-4 text-primary/60" aria-hidden />
      <blockquote className="mt-2 text-sm leading-relaxed">{t("introduction.body", { ns: namespace })}</blockquote>
      <figcaption className="mt-3 flex flex-col items-start gap-1 text-xs text-muted-foreground">
        <span>{t("aiIntake.halachaDisclaimer")}</span>
        <Button variant="link" size="sm" className="h-auto px-0" asChild>
          <Link to="/halacha">
            <BookOpen aria-hidden />
            {t("aiIntake.halachaLink")}
          </Link>
        </Button>
      </figcaption>
    </figure>
  );
}
