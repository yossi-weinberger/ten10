import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { XCircle } from "lucide-react";
import { BrandDone } from "@/components/brand/BrandDone";
import { SupportChargeNote } from "@/components/support/SupportChargeNote";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import { SUPPORT_PAYMENT_URL } from "@/lib/support-payment";

export type SupportOutcome = "thanks" | "failed";

interface SupportResultPageProps {
  outcome: SupportOutcome;
}

function outcomeCopy(outcome: SupportOutcome): {
  title: "thanks.title" | "failed.title";
  body: "thanks.body" | "failed.body";
} {
  switch (outcome) {
    case "thanks":
      return { title: "thanks.title", body: "thanks.body" };
    case "failed":
      return { title: "failed.title", body: "failed.body" };
    default: {
      const exhaustive: never = outcome;
      return exhaustive;
    }
  }
}

export function SupportThanksPage() {
  return <SupportResultPage outcome="thanks" />;
}

export function SupportFailedPage() {
  return <SupportResultPage outcome="failed" />;
}

export function SupportResultPage({ outcome }: SupportResultPageProps) {
  const { t, i18n } = useTranslation("support");
  const { user, loading } = useAuth();
  const { platform } = usePlatform();
  const copy = outcomeCopy(outcome);
  const homeTo = platform === "desktop" || (!loading && user) ? "/" : "/landing";

  return (
    <div
      className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center p-6 text-center"
      dir={i18n.dir()}
    >
      {outcome === "thanks" ? (
        <BrandDone className="mb-8 h-24 w-24" />
      ) : (
        <XCircle className="mb-8 h-16 w-16 text-destructive" aria-hidden="true" />
      )}
      <h1 className="mb-3 text-4xl font-bold text-foreground md:text-5xl">
        {t(copy.title)}
      </h1>
      <p
        className={`max-w-md text-lg text-muted-foreground ${
          outcome === "thanks" ? "mb-3" : "mb-8"
        }`}
      >
        {t(copy.body)}
      </p>
      {outcome === "thanks" && (
        <p className="mb-8 max-w-md text-sm font-medium text-foreground">
          <SupportChargeNote />
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link to={homeTo}>{t("backHome")}</Link>
        </Button>
        {outcome === "failed" && (
          <Button asChild size="lg" variant="outline">
            <a href={SUPPORT_PAYMENT_URL} rel="noopener noreferrer">
              {t("retry")}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
