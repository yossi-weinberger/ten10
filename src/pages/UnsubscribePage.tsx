import { useEffect, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface UnsubscribePayload {
  userId: string;
  email: string;
  type: "reminder" | "all";
  exp: number;
}

export default function UnsubscribePage() {
  const { t } = useTranslation("auth");
  const search = useSearch({ from: "/unsubscribe" });
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [unsubscribeType, setUnsubscribeType] = useState<"reminder" | "all">(
    "all"
  );

  useEffect(() => {
    const token = (search as any).token;
    const type = (search as any).type || "all";

    if (!token) {
      setStatus("error");
      setTitle(t("unsubscribe.error.invalidToken.title"));
      setMessage(t("unsubscribe.error.invalidToken.message"));
      return;
    }

    setUnsubscribeType(type as "reminder" | "all");
    handleUnsubscribe(token, type as "reminder" | "all");
  }, [search, t]);

  const handleUnsubscribe = async (token: string, type: "reminder" | "all") => {
    try {
      // Verify and decode JWT token
      const payload = await verifyToken(token);

      if (!payload) {
        setStatus("error");
        setTitle(t("unsubscribe.error.expiredToken.title"));
        setMessage(t("unsubscribe.error.expiredToken.message"));
        return;
      }

      // Update user preferences
      const { error } = await supabase.rpc("update_user_preferences", {
        p_user_id: payload.userId,
        p_reminder_enabled: type === "reminder" ? false : null,
        p_mailing_list_consent: type === "all" ? false : null,
      });

      if (error) {
        console.error("Error updating preferences:", error);
        setStatus("error");
        setTitle(t("unsubscribe.error.updateFailed.title"));
        setMessage(t("unsubscribe.error.updateFailed.message"));
        return;
      }

      // Success
      setStatus("success");
      if (type === "reminder") {
        setTitle(t("unsubscribe.success.reminder.title"));
        setMessage(t("unsubscribe.success.reminder.message"));
      } else {
        setTitle(t("unsubscribe.success.all.title"));
        setMessage(t("unsubscribe.success.all.message"));
      }
    } catch (error) {
      console.error("Unsubscribe error:", error);
      setStatus("error");
      setTitle(t("unsubscribe.error.general.title"));
      setMessage(t("unsubscribe.error.general.message"));
    }
  };

  const verifyToken = async (
    token: string
  ): Promise<UnsubscribePayload | null> => {
    try {
      // Simple JWT decode (without verification for now - we'll add proper verification later)
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));

      // Check expiration
      if (payload.exp < Date.now() / 1000) {
        return null;
      }

      return payload as UnsubscribePayload;
    } catch (error) {
      console.error("Token verification error:", error);
      return null;
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
