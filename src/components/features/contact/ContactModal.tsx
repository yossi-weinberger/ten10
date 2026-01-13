import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import Turnstile from "react-turnstile";
import { ContactForm } from "./ContactForm";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { contactService } from "@/lib/data-layer/contact.service";
import type {
  ContactDevFormValues,
  ContactRabbiFormValues,
} from "@/lib/schemas";
import { useMediaQuery } from "@/hooks/use-media-query";

interface ContactModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type ContactFormValues = ContactRabbiFormValues | ContactDevFormValues;

export const ContactModal = ({ isOpen, onOpenChange }: ContactModalProps) => {
  const { t, i18n } = useTranslation("contact");
  const { user } = useAuth();
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"rabbi" | "dev">("rabbi");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Reset CAPTCHA when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCaptchaToken("");
      setIsSubmitting(false);
    }
    onOpenChange(open);
  };

  const handleSubmit = async (values: ContactFormValues) => {
    setIsSubmitting(true);
    try {
      const isDevChannel = activeTab === "dev";
      const result = await contactService.submitContactForm({
        channel: activeTab === "rabbi" ? "halacha" : "dev",
        subject: values.subject,
        body: values.body,
        captchaToken: values.captchaToken,
        attachments: values.attachments,
        ...(isDevChannel && {
          severity: (values as ContactDevFormValues).severity,
        }),
        userName: user?.user_metadata.full_name,
        userEmail: user?.email,
      });

      if (result.success) {
        toast.success(
          `${t("forms.successToast")} Ticket ID: ${result.ticketId}`
        );
        handleOpenChange(false);
      } else {
        throw new Error(result.error || "Submission failed");
      }
    } catch (err) {
      toast.error(t("forms.errorToast"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <>
      <Tabs
        defaultValue="rabbi"
        className="w-full"
        onValueChange={(value) => setActiveTab(value as "rabbi" | "dev")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rabbi">{t("modal.tabs.rabbi")}</TabsTrigger>
          <TabsTrigger value="dev">{t("modal.tabs.dev")}</TabsTrigger>
        </TabsList>
        <TabsContent value="rabbi">
          <ContactForm
            key="rabbi"
            channel="rabbi"
            captchaToken={captchaToken}
            onSubmit={handleSubmit}
          />
        </TabsContent>
        <TabsContent value="dev">
          <ContactForm
            key="dev"
            channel="dev"
            captchaToken={captchaToken}
            onSubmit={handleSubmit}
          />
        </TabsContent>
      </Tabs>
      {/* Shared CAPTCHA outside tabs */}
      <div className="mt-4">
        <Turnstile
          sitekey={import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY}
          onVerify={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken("")}
          refreshExpired="auto"
          appearance="always"
        />
      </div>
      {/* Submit button after CAPTCHA */}
      <div className="flex justify-end mt-4" dir={i18n.dir()}>
        <Button
          type="submit"
          form={`contact-form-${activeTab}`}
          disabled={isSubmitting || !captchaToken}
        >
          {isSubmitting ? t("forms.submitting") : t("forms.submit")}
        </Button>
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("modal.title")}</DialogTitle>
            <DialogDescription>{t("modal.description")}</DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-start">
          <DrawerTitle>{t("modal.title")}</DrawerTitle>
          <DrawerDescription>{t("modal.description")}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-8 overflow-y-auto">{content}</div>
      </DrawerContent>
    </Drawer>
  );
};
