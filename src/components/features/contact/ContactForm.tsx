import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Turnstile from "react-turnstile";
import { toast } from "sonner";
import { useMemo } from "react";
import { z } from "zod";

import {
  createContactDevFormSchema,
  createContactRabbiFormSchema,
  ContactDevFormValues,
  ContactRabbiFormValues,
} from "@/lib/schemas";
import { contactService } from "@/lib/data-layer/contact.service";
import { useAuth } from "@/contexts/AuthContext";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ContactFormValues = ContactRabbiFormValues | ContactDevFormValues;

interface ContactFormProps {
  channel: "rabbi" | "dev";
  onClose: () => void;
}

export const ContactForm = ({ channel, onClose }: ContactFormProps) => {
  const { t, i18n } = useTranslation("contact");
  const { user } = useAuth();

  const isDevChannel = channel === "dev";

  const contactSchema = useMemo(
    () =>
      isDevChannel
        ? createContactDevFormSchema(t)
        : createContactRabbiFormSchema(t),
    [t, isDevChannel]
  );

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema as any), // Use 'as any' to handle the union type schema
    defaultValues: {
      subject: "",
      body: "",
      captchaToken: "",
      ...(isDevChannel && { severity: "low" }),
    },
  });

  const {
    formState: { isSubmitting },
  } = form;
  const captchaToken = form.watch("captchaToken");

  const handleSubmit = async (values: ContactFormValues) => {
    try {
      const result = await contactService.submitContactForm({
        channel: channel,
        subject: values.subject,
        body: values.body,
        captchaToken: values.captchaToken,
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
        onClose();
      } else {
        throw new Error(result.error || "Submission failed");
      }
    } catch (err) {
      toast.error(t("forms.errorToast"));
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
        dir={i18n.dir()}
      >
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-start">
                {t("forms.subject.label")}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t("forms.subject.placeholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isDevChannel && (
          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-start">
                  {t("forms.severity.label")}
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("forms.severity.placeholder")}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">
                      {t("forms.severity.low")}
                    </SelectItem>
                    <SelectItem value="med">
                      {t("forms.severity.med")}
                    </SelectItem>
                    <SelectItem value="high">
                      {t("forms.severity.high")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-start">
                {t("forms.body.label")}
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={
                    isDevChannel
                      ? t("forms.body.placeholderDev")
                      : t("forms.body.placeholderRabbi")
                  }
                  className="resize-y min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="captchaToken"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Turnstile
                  sitekey={import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY}
                  onVerify={(token) => field.onChange(token)}
                  onExpire={() => field.onChange("")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !captchaToken}>
            {isSubmitting ? t("forms.submitting") : t("forms.submit")}
          </Button>
        </div>
      </form>
    </Form>
  );
};
