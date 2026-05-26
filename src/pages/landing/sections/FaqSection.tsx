import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "../constants/faqs";

const MotionAccordionItem = motion.create(AccordionItem);

interface FaqSectionProps {
  sectionRef: React.RefObject<HTMLElement | null>;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ sectionRef }) => {
  const { t } = useTranslation("landing");

  return (
    <section
      id="faq"
      ref={sectionRef}
      className="bg-background px-4 py-20 text-foreground"
    >
      <div className="container mx-auto max-w-4xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            {t("faq.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            {t("faq.subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <Accordion type="single" collapsible className="w-full grid gap-4">
            {faqs.map((faq, index) => (
              <MotionAccordionItem
                key={index}
                value={`item-${index}`}
                className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <AccordionTrigger className="px-6 py-4 text-start text-lg font-semibold text-card-foreground transition-colors hover:bg-muted data-[state=open]:text-primary">
                  {t(faq.questionKey)}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <p className="text-start leading-relaxed text-muted-foreground">
                    {t(faq.answerKey)}
                  </p>
                </AccordionContent>
              </MotionAccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ duration: 0.35, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-muted-foreground">
            {t("faq.moreQuestions")}{" "}
            <a
              href="mailto:support@ten10-app.com"
              className="text-primary font-medium hover:underline"
            >
              support@ten10-app.com
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};
