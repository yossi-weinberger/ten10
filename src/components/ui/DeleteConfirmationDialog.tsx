import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveConfirmationDialog } from "@/components/ui/ResponsiveConfirmationDialog";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
}

export const DeleteConfirmationDialog: FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  pendingLabel,
  pending = false,
}) => {
  const { t, i18n } = useTranslation("data-tables");

  return (
    <ResponsiveConfirmationDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title={title}
      description={description}
      confirmLabel={confirmLabel ?? t("actions.delete")}
      cancelLabel={t("actions.cancel")}
      pending={pending}
      pendingLabel={pendingLabel ?? t("actions.delete")}
      variant="destructive"
      dir={i18n.dir()}
    />
  );
};
