import { useLayoutEffect, useRef, useState } from "react";
import { BotMessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { InspirationView } from "@/lib/ai/inspiration-pick";
import { KIND_TINT } from "./card-style";
import { KindTag } from "./KindTag";

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

  // "Read more" only when the four folded lines really hide text, at the panel's current width.
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
  const showSource = source && source !== "לא צוין במקור המיובא" && source !== "Not specified in imported source";
  return (
    <Card className="grid gap-2 p-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <KindTag icon={BotMessageSquare} tint={KIND_TINT.knowledge}>{t("aiIntake.inspiration.tag")}</KindTag>
        {showSource ? <span className="min-w-0 truncate text-xs text-muted-foreground" title={source}>{source}</span> : null}
      </div>
      <p className="text-sm font-medium">{item.title}</p>
      <blockquote ref={bodyRef} className={`whitespace-pre-wrap text-sm leading-relaxed ${open ? "" : "line-clamp-4"}`}>
        {item.body}
      </blockquote>
      {onAnother || (clipped && !open) ? (
        <div className="flex items-center gap-2">
          {onAnother ? (
            <Button type="button" variant="outline" size="sm" onClick={onAnother}>
              {t("aiIntake.inspiration.another")}
            </Button>
          ) : null}
          {clipped && !open ? (
            <Button type="button" variant="link" size="sm" className="touch-target relative ms-auto h-auto px-0 text-xs" onClick={() => setOpen(true)}>
              {t("aiIntake.inspiration.more")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
