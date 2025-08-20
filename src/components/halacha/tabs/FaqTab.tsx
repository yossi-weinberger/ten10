import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HalachaTabLayout } from "../HalachaTabLayout";
import { formatText } from "../utils";

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
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="ps-2">
              <div
                className="text-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatText(item.answer) }}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </HalachaTabLayout>
  );
};
