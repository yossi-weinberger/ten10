import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BotMessageSquare, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AI_BETA_TERMS_VERSION } from "@/lib/ai/beta-terms-version";
import { supabase } from "@/lib/supabaseClient";
import {
  COACH_LINGER_MS,
  DIALOG_RETRY_MS,
  INTRO_DELAY_MS,
  RIPPLE_MS,
  RIPPLE_REPEATS,
  clearAssistantIntroSeen,
  hasSeenAssistantCoach,
  hasSeenAssistantIntro,
  isBlockingDialogOpen,
  markAssistantCoachShown,
  markAssistantIntroSeen,
  prefersReducedMotion,
  readIntroPreview,
} from "./assistant-intro";
import {
  getAssistantConsentCover,
  requestAssistantOpen,
  subscribeAssistantConsentCover,
} from "./assistant-open";
import "./assistant-intro.css";

type IntroPhase = "idle" | "ripple" | "coach";

function Sparkle({ className, delayMs }: { className: string; delayMs: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`assistant-intro-spark ${className}`}
      style={{ animationDelay: `${delayMs}ms` }}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M8 0l1.2 5.2L14 8l-4.8 1.8L8 15l-1.2-5.2L2 8l4.8-1.8L8 0z"
      />
    </svg>
  );
}

/** The floating button for the assistant, where the contact button was. Contact moved into the menu. */
export function AssistantFab({
  userId = null,
  mobileHidden = false,
}: {
  userId?: string | null;
  /** Hide the FAB below the md breakpoint (e.g. import route footer collision). */
  mobileHidden?: boolean;
}) {
  const { t } = useTranslation("navigation");
  const consentCovered = useSyncExternalStore(
    subscribeAssistantConsentCover,
    getAssistantConsentCover,
    () => false,
  );
  const [hidden, setHidden] = useState(false);
  const [phase, setPhase] = useState<IntroPhase>("idle");
  const [forceMotion, setForceMotion] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);

  const clearIntroTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  const later = useCallback((ms: number, run: () => void) => {
    const id = window.setTimeout(run, ms);
    timersRef.current.push(id);
  }, []);

  const hideIntro = useCallback(() => {
    clearIntroTimers();
    setPhase("idle");
  }, [clearIntroTimers]);

  function openAssistant() {
    hideIntro();
    requestAssistantOpen();
  }

  useEffect(() => {
    const syncHidden = () => {
      const isSelectionActive = document.body.dataset.mobileSelectionActive === "true";
      const isSwipeOpen = document.body.dataset.mobileSwipeOpen === "true";
      setHidden(isSelectionActive || isSwipeOpen);
    };

    syncHidden();

    const observer = new MutationObserver(syncHidden);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-mobile-selection-active", "data-mobile-swipe-open"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    clearIntroTimers();
    if (!userId || hidden || consentCovered) return;

    const preview = readIntroPreview(window.location.search, import.meta.env.DEV);
    if (preview === "reset") clearAssistantIntroSeen(localStorage, userId);
    const forced = preview === "replay" || preview === "motion" || preview === "reset";
    if (!forced && hasSeenAssistantIntro(localStorage, userId)) return;

    let cancelled = false;
    const schedule = (ms: number, run: () => void) => {
      if (cancelled) return;
      later(ms, () => {
        if (!cancelled) run();
      });
    };

    const showCoach = () => {
      if (cancelled) return;
      if (!forced && hasSeenAssistantCoach(localStorage, userId)) {
        setPhase("idle");
        return;
      }
      markAssistantCoachShown(localStorage, userId);
      setPhase("coach");
      schedule(COACH_LINGER_MS, () => {
        if (!cancelled) hideIntro();
      });
    };

    const play = () => {
      if (cancelled) return;
      if (isBlockingDialogOpen()) {
        schedule(DIALOG_RETRY_MS, play);
        return;
      }
      const motion = preview === "motion" || !prefersReducedMotion();
      setForceMotion(preview === "motion");
      if (!motion) {
        showCoach();
        return;
      }
      setPhase("ripple");
      schedule(RIPPLE_MS * RIPPLE_REPEATS, showCoach);
    };

    schedule(INTRO_DELAY_MS, play);

    if (!forced) {
      void Promise.resolve(supabase.rpc("ai_beta_consent_status")).then(({ data }) => {
        if (cancelled || !data || typeof data !== "object") return;
        const row = data as { accepted?: unknown; version?: unknown };
        if (row.accepted === true && row.version === AI_BETA_TERMS_VERSION) {
          cancelled = true;
          clearIntroTimers();
          markAssistantIntroSeen(localStorage, userId);
          setPhase("idle");
        }
      }).catch(() => undefined);
    }

    return () => {
      cancelled = true;
      clearIntroTimers();
    };
  }, [userId, hidden, consentCovered, clearIntroTimers, later, hideIntro]);

  useEffect(() => {
    if (phase !== "coach") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") hideIntro();
    };
    const onPointer = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && root.contains(event.target)) return;
      hideIntro();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [phase, hideIntro]);

  if (hidden || consentCovered) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className={`fixed bottom-6 max-md:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] mobile-landscape:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] end-6 z-50 ${mobileHidden ? "max-md:hidden" : ""} ${forceMotion ? "assistant-intro-force-motion" : ""}`}
    >
      <div className="group relative">
        <span className="assistant-hover-ring" />
        <span className="assistant-hover-ring assistant-intro-ring-late" />
        {phase === "ripple" && !mobileHidden ? (
          <>
            <span className="assistant-intro-ring" />
            <span className="assistant-intro-ring assistant-intro-ring-late" />
            <Sparkle className="-top-3 end-1" delayMs={0} />
            <Sparkle className="-top-1 -start-3" delayMs={80} />
          </>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className={`relative z-10 size-14 mobile-landscape:size-12 rounded-full shadow-lg motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-105 [&_svg]:size-7 mobile-landscape:[&_svg]:size-6 ${phase === "ripple" ? "assistant-intro-breathe" : ""}`}
              aria-label={t("menu.assistant")}
              onClick={openAssistant}
            >
              <BotMessageSquare aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("menu.assistant")}</TooltipContent>
        </Tooltip>
        {phase === "coach" && !mobileHidden ? (
          <div
            role="status"
            aria-live="polite"
            aria-labelledby="assistant-intro-title"
            className="assistant-intro-coach absolute bottom-[calc(100%+0.75rem)] end-0 w-[min(18rem,calc(100vw-3rem))] rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg"
          >
            <div className="flex items-start gap-2">
              <p id="assistant-intro-title" className="flex-1 text-sm font-medium">
                {t("assistantIntro.title")}
              </p>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-6 shrink-0"
                aria-label={t("assistantIntro.close")}
                onClick={hideIntro}
              >
                <X className="size-3.5" aria-hidden />
              </Button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("assistantIntro.body")}</p>
            <Button type="button" size="sm" className="mt-3" onClick={openAssistant}>
              {t("assistantIntro.try")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
