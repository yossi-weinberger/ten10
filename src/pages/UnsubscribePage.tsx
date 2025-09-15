import { useEffect, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface UnsubscribePayload {
  userId: string;
  email: string;
  type: "reminder" | "all";
  exp: number;
}

export default function UnsubscribePage() {
  const search = useSearch({ from: "/unsubscribe" });
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    const token = (search as any).token;
    const type = (search as any).type || "all";

    if (!token) {
      setStatus("error");
      setTitle("קישור לא תקין");
      setMessage("הקישור שלחצת עליו אינו תקין או פג תוקפו.");
      return;
    }

    handleUnsubscribe(token, type as "reminder" | "all");
  }, [search]);

  const handleUnsubscribe = async (token: string, type: "reminder" | "all") => {
    try {
      // Verify and decode JWT token
      const payload = await verifyToken(token);

      if (!payload) {
        setStatus("error");
        setTitle("קישור פג תוקף");
        setMessage(
          "הקישור שלחצת עליו פג תוקפו. אנא פנה לדף ההגדרות באפליקציה."
        );
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
        setTitle("שגיאה");
        setMessage("אירעה שגיאה בעת עדכון ההעדפות. אנא נסה שוב מאוחר יותר.");
        return;
      }

      // Success
      setStatus("success");
      if (type === "reminder") {
        setTitle("התזכורות בוטלו בהצלחה");
        setMessage(
          "לא תקבל יותר תזכורות חודשיות. תוכל להפעיל אותן מחדש בהגדרות האפליקציה."
        );
      } else {
        setTitle("הסרת מרשימת התפוצה בוטלה בהצלחה");
        setMessage("הוסרת מרשימת התפוצה שלנו. לא תקבל יותר מיילים מ-Ten10.");
      }
    } catch (error) {
      console.error("Unsubscribe error:", error);
      setStatus("error");
      setTitle("שגיאה");
      setMessage("אירעה שגיאה לא צפויה. אנא נסה שוב מאוחר יותר.");
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
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4">
            {status === "loading" && (
              <Loader2 className="h-16 w-16 animate-spin mx-auto text-blue-500" />
            )}
            {status === "success" && (
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            )}
            {status === "error" && (
              <XCircle className="h-16 w-16 mx-auto text-red-500" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-right">
            {title || "מעבד בקשה..."}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-6 text-right leading-relaxed">
            {message || "אנא המתן בזמן שאנו מעבדים את הבקשה שלך..."}
          </p>
          <Button
            onClick={() => (window.location.href = "https://ten10-app.com")}
            className="w-full"
          >
            חזור לאפליקציה
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
