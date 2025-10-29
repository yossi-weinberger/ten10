import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HalachaTabLayout } from "../HalachaTabLayout";
import { FormattedText } from "../FormattedText";

export const FaqTab = () => {
  const { t } = useTranslation("halacha-faq");

  return (
    <HalachaTabLayout title={t("cardTitle")} description={t("cardDescription")}>
      <Accordion type="single" collapsible className="w-full">
        {(
          t("questions", { returnObjects: true }) as Array<{
            question: string;
            answer: string;
          }>
        ).map((item, index) => (
          <AccordionItem value={`item-${index}`} key={index}>
            <AccordionTrigger className="no-underline hover:no-underline text-base text-foreground text-right">
              <FormattedText as="span">{item.question}</FormattedText>
            </AccordionTrigger>
            <AccordionContent className="ps-2">
              <FormattedText
                as="div"
                className="text-foreground leading-relaxed"
              >
                {item.answer}
              </FormattedText>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </HalachaTabLayout>
  );
};
