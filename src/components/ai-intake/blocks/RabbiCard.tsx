import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import Turnstile from "react-turnstile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContactModal } from "@/components/features/contact/ContactModal";
import { useAuth } from "@/contexts/AuthContext";
import { contactService } from "@/lib/data-layer/contact.service";
import { KIND_TINT } from "./card-style";
import { KindTag } from "./KindTag";

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
    <div className="grid gap-2.5">
      {/* Why a rabbi: the halacha pages have no answer for this. */}
      <p className="text-sm">{t("aiIntake.rabbiIntro")}</p>
      <Card className="grid gap-2 p-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <KindTag icon={MessageCircle} tint={KIND_TINT.knowledge}>{t("aiIntake.rabbiTag")}</KindTag>
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {t("aiIntake.rabbiReply", { email: user?.email ?? t("aiIntake.rabbiYourEmail") })}
        </span>
      </div>
      <p className="text-sm whitespace-pre-wrap">{text}</p>
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
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="ghost" className="px-2" onClick={onDismiss}>
              {t("aiIntake.rabbiLater")}
            </Button>
            <Button type="button" size="sm" variant="outline" className="ms-auto" onClick={() => setEditing(true)}>
              {t("aiIntake.rabbiEdit")}
            </Button>
            <Button type="button" size="sm" disabled={!captchaToken || sending} onClick={() => void send()}>
              {t("aiIntake.rabbiSend")}
            </Button>
          </div>
        </>
      )}
      </Card>
      <ContactModal
        isOpen={editing}
        onOpenChange={setEditing}
        initialSubject={t("aiIntake.rabbiSubject")}
        initialBody={text}
      />
    </div>
  );
}
