import { Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";

export function ReceiptAttachment({
  link,
  onOpen,
}: {
  link: string | null;
  onOpen: () => void;
}) {
  const { t } = useTranslation("navigation");
  return (
    <div className="flex flex-col gap-2">
      <Attachment size="sm">
        <AttachmentMedia>
          <Receipt aria-hidden />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{t("aiIntake.viewReceipt")}</AttachmentTitle>
          <AttachmentDescription>{t("aiIntake.receiptKept")}</AttachmentDescription>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction aria-label={t("aiIntake.viewReceipt")} onClick={onOpen}>
            <Receipt aria-hidden />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer">
          {t("aiIntake.viewReceipt")}
        </a>
      ) : null}
    </div>
  );
}
