import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useEffect } from "react";

import {
  createContactDevFormSchema,
  createContactRabbiFormSchema,
  ContactDevFormValues,
  ContactRabbiFormValues,
} from "@/lib/schemas";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";

type ContactFormValues = ContactRabbiFormValues | ContactDevFormValues;

interface ContactFormProps {
  channel: "rabbi" | "dev";
  captchaToken: string;
  onSubmit: (values: ContactFormValues) => Promise<void>;
}

export const ContactForm = ({
  channel,
  captchaToken,
  onSubmit,
}: ContactFormProps) => {
  const { t, i18n } = useTranslation("contact");

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
      attachments: [],
      ...(isDevChannel && { severity: "low" }),
    },
  });

  // Update form when captchaToken changes from parent
  const { setValue } = form;
  useEffect(() => {
    setValue("captchaToken", captchaToken);
  }, [captchaToken, setValue]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        dir={i18n.dir()}
        id={`contact-form-${channel}`}
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
          name="attachments"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-start">
                {t("forms.attachments.label", "Attachments")}
              </FormLabel>
              <FormControl>
                <FileUpload
                  value={field.value || []}
                  onChange={field.onChange}
                  maxFiles={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hidden field to store captchaToken for validation */}
        <FormField
          control={form.control}
          name="captchaToken"
          render={({ field }) => (
            <FormItem className="hidden">
              <FormControl>
                <input type="hidden" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
