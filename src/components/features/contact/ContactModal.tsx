import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { ContactForm } from "./ContactForm";

interface ContactModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const ContactModal = ({ isOpen, onOpenChange }: ContactModalProps) => {
  const { t } = useTranslation("contact");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("modal.title")}</DialogTitle>
          <DialogDescription>{t("modal.description")}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="rabbi" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rabbi">{t("modal.tabs.rabbi")}</TabsTrigger>
            <TabsTrigger value="dev">{t("modal.tabs.dev")}</TabsTrigger>
          </TabsList>
          <TabsContent value="rabbi">
            <ContactForm channel="rabbi" onClose={() => onOpenChange(false)} />
          </TabsContent>
          <TabsContent value="dev">
            <ContactForm channel="dev" onClose={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
