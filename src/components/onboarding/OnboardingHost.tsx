import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import { PUBLIC_ROUTES } from "@/lib/constants";
import { hasAnyTransaction } from "@/lib/data-layer/transactions.service";
import { supabase } from "@/lib/supabaseClient";
import { useDonationStore } from "@/lib/store";
import { CURRENT_ONBOARDING_VERSION } from "@/lib/onboarding/constants";
import {
  isOnboardingEligible,
  resolveTransactionOnboardingOutcome,
} from "@/lib/onboarding/eligibility";
import { isNewUserOnboardingEnabled } from "@/lib/onboarding/flags";
import {
  completeOnboarding,
  getOnboardingState,
  isOnboardingTourActive,
  restartOnboarding,
  setOnboardingTourActive,
  skipOnboarding,
  startOnboarding,
  updateOnboardingChecklist,
} from "@/lib/onboarding/persistence";
import {
  trackOnboardingCompleted,
  trackOnboardingOffered,
  trackOnboardingRestarted,
  trackOnboardingSkipped,
  trackOnboardingStarted,
  trackOnboardingStepCompleted,
  trackOnboardingStepViewed,
} from "@/lib/onboarding/analytics";
import { subscribeOnboardingTransactionCreated } from "@/lib/onboarding/transactionBridge";
import { markCurrentWhatsNewSeen } from "@/lib/onboarding/whatsNew";
import {
  destroyOnboardingTour,
  startOnboardingTour,
} from "@/lib/onboarding/driverHost";
import {
  buildFirstRunSteps,
  firstRunStartIndex,
} from "@/lib/onboarding/tours/firstRun";
import { logger } from "@/lib/logger";
import { WelcomeDialog } from "./WelcomeDialog";
import { OnboardingSuccessDialog } from "./OnboardingSuccessDialog";
import {
  OnboardingUiContext,
  type OnboardingUiValue,
} from "./OnboardingContext";

const CURRENT_TERMS_VERSION = "v1.0";

async function hasAcceptedCurrentTerms(
  platform: "web" | "desktop",
  userId: string | undefined,
  storeVersion: string | null | undefined,
): Promise<boolean> {
  if (platform === "desktop") {
    return storeVersion === CURRENT_TERMS_VERSION;
  }
  if (!userId) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("terms_accepted_at, terms_version")
    .eq("id", userId)
    .single();

  if (error || !data) return false;
  return Boolean(data.terms_accepted_at) && data.terms_version === CURRENT_TERMS_VERSION;
}

export function OnboardingHost({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { platform } = usePlatform();
  const { t, i18n, ready } = useTranslation("onboarding");
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const hasHydrated = useDonationStore((state) => state._hasHydrated);
  const onboarding = useDonationStore((state) => state.settings.onboarding);
  const termsAcceptedVersion = useDonationStore(
    (state) => state.settings.termsAcceptedVersion,
  );

  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [transactionProbe, setTransactionProbe] = useState<
    "pending" | "empty" | "has"
  >("pending");
  const [tourTick, setTourTick] = useState(0);
  const offeredRef = useRef(false);

  const isPublicPath = PUBLIC_ROUTES.includes(pathname);
  const tourActive = isOnboardingTourActive();
  const status = onboarding?.status ?? "idle";

  const refreshTourTick = useCallback(() => {
    setTourTick((value) => value + 1);
  }, []);

  const pauseTour = useCallback(() => {
    setOnboardingTourActive(false);
    destroyOnboardingTour();
    refreshTourTick();
  }, [refreshTourTick]);

  useEffect(() => {
    if (!hasHydrated || platform === "loading" || isPublicPath) return;

    let cancelled = false;
    hasAnyTransaction()
      .then((exists) => {
        if (!cancelled) setTransactionProbe(exists ? "has" : "empty");
      })
      .catch((error) => {
        logger.error("[onboarding] Failed to count transactions:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, platform, isPublicPath, status]);

  useEffect(() => {
    if (pathname !== "/analytics") return;
    if (getOnboardingState().analyticsOpened) return;
    updateOnboardingChecklist({ analyticsOpened: true });
  }, [pathname]);

  useEffect(() => {
    if (
      !ready ||
      !hasHydrated ||
      platform === "loading" ||
      isPublicPath ||
      transactionProbe === "pending" ||
      offeredRef.current
    ) {
      return;
    }

    let cancelled = false;

    const evaluateOffer = async () => {
      if (platform === "web" && !user) return;

      const termsAccepted = await hasAcceptedCurrentTerms(
        platform === "desktop" ? "desktop" : "web",
        user?.id,
        termsAcceptedVersion,
      );
      if (cancelled) return;

      const eligible = isOnboardingEligible({
        platform: platform === "desktop" ? "desktop" : "web",
        userCreatedAt: user?.created_at ?? null,
        termsAccepted,
        transactionCount: transactionProbe === "has" ? 1 : 0,
        flagEnabled: isNewUserOnboardingEnabled(),
        onboarding: getOnboardingState(),
        currentVersion: CURRENT_ONBOARDING_VERSION,
      });

      if (!eligible) return;

      offeredRef.current = true;
      await markCurrentWhatsNewSeen({
        platform: platform === "desktop" ? "desktop" : "web",
        userId: user?.id ?? null,
      });
      if (cancelled) return;
      trackOnboardingOffered();
      setWelcomeOpen(true);
    };

    void evaluateOffer();
    return () => {
      cancelled = true;
    };
  }, [
    ready,
    hasHydrated,
    platform,
    isPublicPath,
    user,
    termsAcceptedVersion,
    transactionProbe,
  ]);

  useEffect(() => {
    return subscribeOnboardingTransactionCreated(() => {
      const outcome = resolveTransactionOnboardingOutcome({
        status: getOnboardingState().status,
        tourActive: isOnboardingTourActive(),
      });

      if (outcome === "ignore") return;

      completeOnboarding();
      setTransactionProbe("has");
      destroyOnboardingTour();
      refreshTourTick();
      trackOnboardingCompleted();

      if (outcome === "success_dialog") {
        setSuccessOpen(true);
      }
    });
  }, [refreshTourTick]);

  useEffect(() => {
    if (!ready || !tourActive || isPublicPath || welcomeOpen) {
      destroyOnboardingTour();
      return;
    }

    const dir = i18n.dir() === "rtl" ? "rtl" : "ltr";
    startOnboardingTour({
      steps: buildFirstRunSteps(
        {
          next: t("tour.next"),
          prev: t("tour.prev"),
          done: t("tour.done"),
          progress: t("tour.progress"),
          homeSummaryTitle: t("tour.homeSummaryTitle"),
          homeSummaryDescription: t("tour.homeSummaryDescription"),
          addCtaTitle: t("tour.addCtaTitle"),
          addCtaDescription: t("tour.addCtaDescription"),
          formTitle: t("tour.formTitle"),
          formDescription: t("tour.formDescription"),
        },
        dir,
      ),
      startIndex: firstRunStartIndex(pathname),
      dir,
      nextBtnText: t("tour.next"),
      prevBtnText: t("tour.prev"),
      doneBtnText: t("tour.done"),
      progressText: t("tour.progress"),
      callbacks: {
        onStepViewed: trackOnboardingStepViewed,
        onStepCompleted: trackOnboardingStepCompleted,
        onPaused: pauseTour,
      },
    });

    return () => {
      destroyOnboardingTour();
    };
  }, [ready, tourActive, pathname, welcomeOpen, isPublicPath, i18n, t, pauseTour, tourTick]);

  const handleStart = () => {
    startOnboarding();
    setOnboardingTourActive(true);
    setWelcomeOpen(false);
    refreshTourTick();
    trackOnboardingStarted();
  };

  const handleSkip = () => {
    skipOnboarding();
    setWelcomeOpen(false);
    refreshTourTick();
    trackOnboardingSkipped();
  };

  const restartTour = useCallback(() => {
    restartOnboarding();
    offeredRef.current = true;
    setWelcomeOpen(false);
    refreshTourTick();
    trackOnboardingRestarted();
  }, [refreshTourTick]);

  const dismissChecklist = useCallback(() => {
    updateOnboardingChecklist({ checklistDismissed: true });
  }, []);

  const showGettingStarted =
    !isPublicPath &&
    !onboarding?.checklistDismissed &&
    status !== "completed" &&
    (status === "started" || status === "skipped") &&
    !(transactionProbe === "has" && Boolean(onboarding?.analyticsOpened));

  const showHomeCta = showGettingStarted || tourActive || welcomeOpen;

  const uiValue = useMemo<OnboardingUiValue>(
    () => ({
      showHomeCta,
      showGettingStarted,
      hasFirstTransaction: transactionProbe === "has",
      analyticsOpened: Boolean(onboarding?.analyticsOpened),
      dismissChecklist,
      restartTour,
    }),
    [
      showHomeCta,
      showGettingStarted,
      transactionProbe,
      onboarding?.analyticsOpened,
      dismissChecklist,
      restartTour,
    ],
  );

  return (
    <OnboardingUiContext.Provider value={uiValue}>
      {children}
      <WelcomeDialog
        open={welcomeOpen}
        pending={false}
        onStart={handleStart}
        onSkip={handleSkip}
      />
      <OnboardingSuccessDialog
        open={successOpen}
        onDismiss={() => setSuccessOpen(false)}
      />
    </OnboardingUiContext.Provider>
  );
}
