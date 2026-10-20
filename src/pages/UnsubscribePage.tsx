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

  useEffect(() => {
    document.documentElement.dir = i18n.dir();
    document.documentElement.lang = i18n.language;
  }, [i18n, i18n.language]);

  const handleUnsubscribe = useCallback(async (
    token: string,
    type: UnsubscribeType
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "verify-unsubscribe-token",
        {
          body: { token, type },
        }
      );

      if (error || data?.error || !data?.success) {
        logger.error("Unsubscribe failed:", error ?? data?.error);
        
        let statusCode: number | undefined;
        if (error && typeof error === "object" && "context" in error) {
          statusCode = (error.context as Response).status;
        }
        
        const errorType: ErrorType = 
          statusCode === 401 || statusCode === 400 ? "invalidToken" :
          statusCode === 410 ? "expiredToken" :
          statusCode ? "updateFailed" :
          "general";
        
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

  const getKey = (suffix: "title" | "message") => {
    if (result.status === "loading") {
      return suffix === "title" ? "unsubscribe.processing" : "unsubscribe.processingMessage";
    }
    const base = result.status === "success" && result.type
      ? `unsubscribe.success.${result.type}`
      : result.status === "error" && result.errorType
      ? `unsubscribe.error.${result.errorType}`
      : "unsubscribe.processing";
    return `${base}.${suffix}`;
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold text-foreground">
          {t(getKey("title"))}
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
                {t(getKey("message"))}
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
