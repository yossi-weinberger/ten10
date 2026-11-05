import { useState } from "react";
import { useTranslation } from "react-i18next";
import Turnstile from "react-turnstile";
import { Button } from "@/components/ui/button";
import { ContactModal } from "@/components/features/contact/ContactModal";
import { useAuth } from "@/contexts/AuthContext";
import { contactService } from "@/lib/data-layer/contact.service";

export function RabbiCard({
  text,
  ticket,
  interactive,
  onSent,
  onDismiss,
}: {
  text: string;
  ticket: string | null;
  /** False in history: sending from there would file a real ticket the active turn never shows. */
  interactive: boolean;
  onSent: (ticket: string) => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation("navigation");
  const { user } = useAuth();
  const [captchaToken, setCaptchaToken] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);

  async function send() {
    if (!captchaToken || sending || ticket) return;
    setSending(true);
    setFailed(false);
    const result = await contactService.submitContactForm({
      channel: "halacha",
      subject: t("aiIntake.rabbiSubject"),
      body: text,
      captchaToken,
      userName: user?.user_metadata.full_name,
      userEmail: user?.email,
    });
    setSending(false);
    if (!result.success || !result.ticketId) {
      setFailed(true);
      setCaptchaToken("");
      return;
    }
    onSent(result.ticketId);
  }

  return (
    <div className="grid gap-3 rounded-xl bg-primary/5 p-4">
      <p className="text-sm whitespace-pre-wrap">{text}</p>
      <p className="text-xs text-muted-foreground">
        {t("aiIntake.rabbiReply", { email: user?.email ?? t("aiIntake.rabbiYourEmail") })}
      </p>
      {ticket ? <p className="text-sm">{t("aiIntake.rabbiSent", { ticket })}</p> : !interactive ? null : (
        <>
          <Turnstile
            sitekey={import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY}
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken("")}
            refreshExpired="auto"
            appearance="always"
            size={window.matchMedia?.("(max-width: 399px)").matches ? "compact" : "normal"}
          />
          {failed ? <p className="text-sm">{t("aiIntake.rabbiFailed")}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={!captchaToken || sending} onClick={() => void send()}>
              {t("aiIntake.rabbiSend")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
              {t("aiIntake.rabbiEdit")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
              {t("aiIntake.rabbiLater")}
            </Button>
          </div>
        </>
      )}
      <ContactModal
        isOpen={editing}
        onOpenChange={setEditing}
        initialSubject={t("aiIntake.rabbiSubject")}
        initialBody={text}
      />
    </div>
  );
}
