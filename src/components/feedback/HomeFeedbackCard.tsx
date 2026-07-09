import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquareText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isPostHogSupported } from "@/lib/analytics/posthogClient";
import {
  captureHomeFeedbackDismissed,
  captureHomeFeedbackShown,
  FEEDBACK_MIN_TRANSACTIONS,
  FEEDBACK_SOURCE_KEYS,
  type FeedbackSourceKey,
  isHomeFeedbackCompletedLocally,
  isHomeFeedbackSeenLocally,
  markHomeFeedbackSeenLocally,
  submitHomeFeedback,
} from "@/lib/analytics/posthogSurveys";
import { getTransactionsCount } from "@/lib/data-layer/transactions.service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type HomeFeedbackCardProps = {
  /** Sidebar placement: icon+label that collapses with the nav. */
  variant?: "inline" | "sidebar";
  /** When variant is sidebar — mirrors Sidebar expanded state. */
  expanded?: boolean;
};

/**
 * Opt-in feedback: button opens a dialog survey (PostHog API).
 * Shown for identified web users with more than FEEDBACK_MIN_TRANSACTIONS
 * who have not completed the survey yet.
 */
export function HomeFeedbackCard({
  variant = "inline",
  expanded = true,
}: HomeFeedbackCardProps) {
  const { t, i18n } = useTranslation("common");
  const { t: tNav } = useTranslation("navigation");
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<FeedbackSourceKey | "">("");
  const [sourceOther, setSourceOther] = useState("");
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [recommend, setRecommend] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [completed, setCompleted] = useState(() =>
    isHomeFeedbackCompletedLocally()
  );
  const [highlight, setHighlight] = useState(
    () => !isHomeFeedbackSeenLocally()
  );
  /** null = still checking count; avoid flashing the button. */
  const [hasEnoughTransactions, setHasEnoughTransactions] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    if (!user || !isPostHogSupported() || completed) {
      setHasEnoughTransactions(null);
      return;
    }

    let cancelled = false;
    void getTransactionsCount().then((count) => {
      if (!cancelled) {
        setHasEnoughTransactions(count > FEEDBACK_MIN_TRANSACTIONS);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, completed]);

  if (
    !user ||
    !isPostHogSupported() ||
    completed ||
    hasEnoughTransactions !== true
  ) {
    return null;
  }

  const sourceOtherOk =
    source !== "other" || sourceOther.trim().length > 0;
  const canSubmit =
    Boolean(source) &&
    sourceOtherOk &&
    satisfaction != null &&
    recommend != null &&
    !submitting;

  const resetForm = () => {
    setSource("");
    setSourceOther("");
    setSatisfaction(null);
    setRecommend(null);
    setSuggestions("");
    setSubmitted(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      captureHomeFeedbackShown();
      if (highlight) {
        markHomeFeedbackSeenLocally();
        setHighlight(false);
      }
      setOpen(true);
      return;
    }

    if (!submitted) {
      captureHomeFeedbackDismissed();
    }
    setOpen(false);
    if (submitted) {
      setCompleted(true);
    } else {
      resetForm();
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !source || satisfaction == null || recommend == null) {
      return;
    }

    setSubmitting(true);
    try {
      submitHomeFeedback({
        source,
        sourceOther: source === "other" ? sourceOther : undefined,
        satisfaction,
        recommend,
        suggestions,
      });
      setSubmitted(true);
      window.setTimeout(() => {
        setOpen(false);
        setCompleted(true);
      }, 1200);
    } finally {
      setSubmitting(false);
    }
  };

  const isRtl = i18n.dir() === "rtl";
  const openLabel = tNav("menu.feedback");

  const triggerButton =
    variant === "sidebar" ? (
      <Button
        type="button"
        variant="ghost"
        className={cn(
          // Match profile row below: h-14, px-3, icon column 32px, label gap ml/mr-4
          "w-full h-14 z-10 overflow-hidden max-w-full",
          "transition-all duration-300",
          "justify-start px-3 gap-0 items-center",
          "[&_svg]:size-5",
          highlight
            ? "bg-accent/15 text-accent-foreground ring-1 ring-inset ring-accent/40 hover:bg-accent/25"
            : "text-foreground"
        )}
        onClick={() => handleOpenChange(true)}
        aria-label={openLabel}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          <MessageSquareText className="h-5 w-5" />
          {highlight ? (
            <span
              className="absolute top-0.5 end-0.5 h-2 w-2 rounded-full bg-accent shadow-sm animate-pulse"
              aria-hidden
            />
          ) : null}
        </span>
        <span
          className={cn(
            "flex items-center text-sm font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out min-w-0 leading-none",
            expanded
              ? "max-w-[200px] opacity-100 flex-1"
              : "max-w-0 opacity-0 flex-none",
            expanded ? (isRtl ? "mr-4" : "ml-4") : "mx-0"
          )}
        >
          {openLabel}
        </span>
      </Button>
    ) : (
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => handleOpenChange(true)}
      >
        <MessageSquareText className="h-4 w-4" />
        {openLabel}
      </Button>
    );

  const trigger =
    variant === "sidebar" && !expanded ? (
      <Tooltip>
        <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
        <TooltipContent side={isRtl ? "left" : "right"} sideOffset={8}>
          <p className="max-w-xs text-sm" dir={i18n.dir()}>
            {openLabel}
          </p>
        </TooltipContent>
      </Tooltip>
    ) : (
      triggerButton
    );

  return (
    <div
      className={cn(
        variant === "sidebar" ? "w-full" : "flex justify-center"
      )}
    >
      {trigger}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
          dir={i18n.dir()}
        >
          {submitted ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("feedback.thanks")}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <DialogHeader>
                <DialogTitle>{t("feedback.title")}</DialogTitle>
                <DialogDescription>{t("feedback.subtitle")}</DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label>{t("feedback.sourceLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_SOURCE_KEYS.map((key) => (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant={source === key ? "default" : "outline"}
                      onClick={() => {
                        setSource(key);
                        if (key !== "other") {
                          setSourceOther("");
                        }
                      }}
                    >
                      {t(`feedback.sources.${key}`)}
                    </Button>
                  ))}
                </div>
                {source === "other" ? (
                  <Input
                    id="home-feedback-source-other"
                    value={sourceOther}
                    onChange={(event) => setSourceOther(event.target.value)}
                    placeholder={t("feedback.sourceOtherPlaceholder")}
                    autoComplete="off"
                    maxLength={120}
                  />
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>{t("feedback.satisfactionLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={satisfaction === value ? "default" : "outline"}
                      className={cn("min-w-9")}
                      onClick={() => setSatisfaction(value)}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("feedback.recommendLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={recommend === value ? "default" : "outline"}
                      className={cn("min-w-9")}
                      onClick={() => setRecommend(value)}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="home-feedback-suggestions">
                  {t("feedback.suggestionsLabel")}
                </Label>
                <Textarea
                  id="home-feedback-suggestions"
                  value={suggestions}
                  onChange={(event) => setSuggestions(event.target.value)}
                  placeholder={t("feedback.suggestionsPlaceholder")}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleOpenChange(false)}
                >
                  {t("feedback.later")}
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  {t("feedback.submit")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
