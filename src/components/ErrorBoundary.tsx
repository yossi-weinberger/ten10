import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { capturePostHogException } from "@/lib/analytics/posthogClient";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Identifies which part of the UI failed (sent to PostHog + logs). */
  boundaryName?: string;
  /** Optional custom fallback. Receives a reset callback to retry rendering. */
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time exceptions in its subtree so a single faulty section
 * degrades to an inline "something went wrong / retry" card instead of
 * unmounting (and blanking) the whole app. Without a boundary, React tears
 * down the entire tree up to the root on any render throw.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const { boundaryName } = this.props;
    logger.error(
      `ErrorBoundary${boundaryName ? ` (${boundaryName})` : ""} caught:`,
      error,
      info.componentStack
    );
    // Surface render faults as real $exception events — otherwise a blank
    // screen from a render throw leaves no captured crash to investigate.
    capturePostHogException(error, {
      boundary: boundaryName ?? "unknown",
    });
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) {
        return this.props.fallback({ error, reset: this.reset });
      }
      return <ErrorBoundaryFallback error={error} reset={this.reset} />;
    }
    return this.props.children;
  }
}

function ErrorBoundaryFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const { t, i18n } = useTranslation("common");

  return (
    <Alert variant="destructive" dir={i18n.dir()}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {t("errorBoundary.title", "Something went wrong")}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          {t(
            "errorBoundary.description",
            "This section failed to load. You can try again."
          )}
        </p>
        {import.meta.env.DEV && (
          <p className="font-mono text-xs opacity-80">{error.message}</p>
        )}
        <Button variant="outline" size="sm" onClick={reset}>
          <RefreshCw className="me-2 h-4 w-4" />
          {t("errorBoundary.retry", "Try again")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
