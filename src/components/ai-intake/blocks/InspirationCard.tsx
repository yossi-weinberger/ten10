import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { InspirationView } from "@/lib/ai/inspiration-pick";

export function InspirationCard({
  item,
  onAnother,
}: {
  item: InspirationView | null;
  /** Missing in history: "another" there would change the active turn. */
  onAnother?: () => void;
}) {
  const { t } = useTranslation("navigation");
  const [open, setOpen] = useState(false);
  const [clipped, setClipped] = useState(false);
  const bodyRef = useRef<HTMLQuoteElement | null>(null);

  // "Read more" only when the six folded lines really hide text, at the panel's current width.
  useLayoutEffect(() => {
    const element = bodyRef.current;
    if (!element || open) return;
    const measure = () => setClipped(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [open, item?.body]);

  if (!item) return <p className="text-sm">{t("aiIntake.inspiration.empty")}</p>;
  const source = item.source.trim();
  return (
    <figure className="rounded-xl bg-primary/5 p-4">
      <figcaption className="text-sm font-medium">{item.title}</figcaption>
      <blockquote ref={bodyRef} className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${open ? "" : "line-clamp-6"}`}>
        {item.body}
      </blockquote>
      {source ? <p className="mt-3 text-xs text-muted-foreground">{source}</p> : null}
      <div className="mt-3 flex gap-2">
        {clipped || open ? (
          <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => setOpen((value) => !value)}>
            {t(open ? "aiIntake.inspiration.less" : "aiIntake.inspiration.more")}
          </Button>
        ) : null}
        {onAnother ? (
          <Button type="button" variant="outline" size="sm" onClick={onAnother}>
            {t("aiIntake.inspiration.another")}
          </Button>
        ) : null}
      </div>
    </figure>
  );
}
