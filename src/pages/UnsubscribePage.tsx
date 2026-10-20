import { useEffect, useState, useCallback } from "react";
import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type UnsubscribeType = "reminder" | "marketing" | "all";

type ErrorType = 
  | "invalidToken"
  | "expiredToken" 
  | "updateFailed"
  | "general";

type ResultState = {
  status: "loading" | "success" | "error";
  type?: UnsubscribeType;
  errorType?: ErrorType;
};

export default function UnsubscribePage() {
  const { t, i18n } = useTranslation("auth");
  const search = useSearch({ from: "/unsubscribe" });
  const [result, setResult] = useState<ResultState>({ status: "loading" });

  // Set page direction based on language (matches App.tsx)
  // This will update whenever i18n.language changes (including profile sync)
  useEffect(() => {
    document.documentElement.dir = i18n.dir();
    document.documentElement.lang = i18n.language;
  }, [i18n, i18n.language]);

  const handleUnsubscribe = useCallback(async (
    token: string,
    type: UnsubscribeType
  ) => {
    try {
      // Single call: Edge Function verifies the JWT and updates preferences
      // with service_role. Browser never sends p_user_id to a public RPC.
      const { data, error } = await supabase.functions.invoke(
        "verify-unsubscribe-token",
        {
          body: { token, type },
        }
      );

      if (error || data?.error || !data?.success) {
        logger.error("Unsubscribe failed:", error ?? data?.error);
        
        // For FunctionsHttpError, read status and body from error.context (a Response)
        let statusCode: number | undefined;
        let errorBody: { error?: string } | null = null;
        
        if (error && typeof error === "object" && "context" in error) {
          const ctx = error.context as Response;
          statusCode = ctx.status;
          try {
            errorBody = await ctx.json();
          } catch {
            // body might not be JSON
          }
        }
        
        const errorMsg = (
          errorBody?.error || 
          (typeof data?.error === "string" ? data.error : "") || 
          (error?.message || "")
        ).toLowerCase();
        
        const looksExpired = errorMsg.includes("expired");
        const looksInvalid = 
          errorMsg.includes("invalid") || 
          errorMsg.includes("token") || 
          statusCode === 401 || 
          statusCode === 400;
        
        let errorType: ErrorType = "general";
        if (looksExpired && looksInvalid) {
          errorType = "invalidToken";
        } else if (looksExpired) {
          errorType = "expiredToken";
        } else if (looksInvalid) {
          errorType = "invalidToken";
        } else {
          errorType = "updateFailed";
        }
        
        setResult({ status: "error", errorType });
        return;
      }

      const resolvedType: UnsubscribeType =
        data.type === "reminder" || data.type === "marketing" || data.type === "all" 
          ? data.type 
          : type;

      setResult({ status: "success", type: resolvedType });
    } catch (error) {
      logger.error("Unsubscribe error:", error);
      setResult({ status: "error", errorType: "general" });
    }
  }, []);

  useEffect(() => {
    const searchParams = search as { token?: string; type?: string };
    const token = searchParams.token;
    const type = (searchParams.type || "all") as UnsubscribeType;

    if (!token) {
      setResult({ status: "error", errorType: "invalidToken" });
      return;
    }

    handleUnsubscribe(token, type);
  }, [search, handleUnsubscribe]);

  // Derive title and message from result state and current i18n language
  // This ensures translations update when language changes (e.g. profile sync)
  const getTitle = () => {
    if (result.status === "loading") {
      return t("unsubscribe.processing");
    }
    if (result.status === "success" && result.type) {
      return t(`unsubscribe.success.${result.type}.title`);
    }
    if (result.status === "error" && result.errorType) {
      return t(`unsubscribe.error.${result.errorType}.title`);
    }
    return t("unsubscribe.processing");
  };

  const getMessage = () => {
    if (result.status === "loading") {
      return t("unsubscribe.processingMessage");
    }
    if (result.status === "success" && result.type) {
      return t(`unsubscribe.success.${result.type}.message`);
    }
    if (result.status === "error" && result.errorType) {
      return t(`unsubscribe.error.${result.errorType}.message`);
    }
    return t("unsubscribe.processingMessage");
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold text-foreground">
          {getTitle()}
        </h2>
        <p className="text-muted-foreground">
          {result.status === "loading"
            ? t("unsubscribe.processingMessage")
            : t("unsubscribe.pageSubtitle")}
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center space-y-6 min-h-[300px]">
            <div>
              {result.status === "loading" && (
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
              )}
              {result.status === "success" && (
                <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
              )}
              {result.status === "error" && (
                <XCircle className="h-16 w-16 text-destructive" />
              )}
            </div>

            <div className="space-y-6 flex flex-col items-center">
              <p className="text-lg leading-relaxed text-foreground text-center max-w-md">
                {getMessage()}
              </p>

              {result.status !== "loading" && (
                <Button
                  onClick={() =>
                    (window.location.href = "https://ten10-app.com")
                  }
                  className="min-w-40"
                >
                  {t("unsubscribe.backToApp")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
