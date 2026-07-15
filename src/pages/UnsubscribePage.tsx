import { useEffect, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type UnsubscribeType = "reminder" | "all";

export default function UnsubscribePage() {
  const { t } = useTranslation("auth");
  const search = useSearch({ from: "/unsubscribe" });
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    const searchParams = search as { token?: string; type?: string };
    const token = searchParams.token;
    const type = (searchParams.type || "all") as UnsubscribeType;

    if (!token) {
      setStatus("error");
      setTitle(t("unsubscribe.error.invalidToken.title"));
      setMessage(t("unsubscribe.error.invalidToken.message"));
      return;
    }

    handleUnsubscribe(token, type);
  }, [search, t]);

  const handleUnsubscribe = async (
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
        setStatus("error");
        const looksExpired =
          typeof data?.error === "string" &&
          data.error.toLowerCase().includes("expired");
        if (looksExpired || error?.message?.toLowerCase().includes("401")) {
          setTitle(t("unsubscribe.error.expiredToken.title"));
          setMessage(t("unsubscribe.error.expiredToken.message"));
        } else {
          setTitle(t("unsubscribe.error.updateFailed.title"));
          setMessage(t("unsubscribe.error.updateFailed.message"));
        }
        return;
      }

      const resolvedType: UnsubscribeType =
        data.type === "reminder" || data.type === "all" ? data.type : type;

      setStatus("success");
      if (resolvedType === "reminder") {
        setTitle(t("unsubscribe.success.reminder.title"));
        setMessage(t("unsubscribe.success.reminder.message"));
      } else {
        setTitle(t("unsubscribe.success.all.title"));
        setMessage(t("unsubscribe.success.all.message"));
      }
    } catch (error) {
      logger.error("Unsubscribe error:", error);
      setStatus("error");
      setTitle(t("unsubscribe.error.general.title"));
      setMessage(t("unsubscribe.error.general.message"));
    }
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold text-foreground">
          {title || t("unsubscribe.processing")}
        </h2>
        <p className="text-muted-foreground">
          {status === "loading"
            ? t("unsubscribe.processingMessage")
            : t("unsubscribe.pageSubtitle")}
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center space-y-6 min-h-[300px]">
            <div>
              {status === "loading" && (
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
              )}
              {status === "success" && (
                <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
              )}
              {status === "error" && (
                <XCircle className="h-16 w-16 text-destructive" />
              )}
            </div>

            <div className="space-y-6 flex flex-col items-center">
              <p className="text-lg leading-relaxed text-foreground text-center max-w-md">
                {message || t("unsubscribe.processingMessage")}
              </p>

              {status !== "loading" && (
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
