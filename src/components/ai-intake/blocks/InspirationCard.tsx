import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { INSPIRATION_FOLD_AT, type InspirationView } from "@/lib/ai/inspiration-pick";

export function InspirationCard({
  item,
  onAnother,
}: {
  item: InspirationView | null;
  onAnother: () => void;
}) {
  const { t } = useTranslation("navigation");
  const [open, setOpen] = useState(false);
  if (!item) return <p className="text-sm">{t("aiIntake.inspiration.empty")}</p>;
  const long = item.body.length > INSPIRATION_FOLD_AT;
  const source = item.source.trim();
  return (
    <figure className="rounded-xl bg-primary/5 p-4">
      <figcaption className="text-sm font-medium">{item.title}</figcaption>
      <blockquote className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${long && !open ? "line-clamp-6" : ""}`}>
        {item.body}
      </blockquote>
      {source ? <p className="mt-3 text-xs text-muted-foreground">{source}</p> : null}
      <div className="mt-3 flex gap-2">
        {long ? (
          <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => setOpen((value) => !value)}>
            {t(open ? "aiIntake.inspiration.less" : "aiIntake.inspiration.more")}
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={onAnother}>
          {t("aiIntake.inspiration.another")}
        </Button>
      </div>
    </figure>
  );
}
