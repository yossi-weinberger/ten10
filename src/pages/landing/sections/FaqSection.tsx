import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useScrollAnimation, fadeInUp } from "@/hooks/useScrollAnimation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "../constants/faqs";

interface FaqSectionProps {
  sectionRef: React.RefObject<HTMLElement>;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ sectionRef }) => {
  const { t } = useTranslation("landing");
  const faqRef = useScrollAnimation({ threshold: 0.1 });

  return (
    <section
      id="faq"
      ref={sectionRef}
      className="py-20 px-4 bg-gray-50 dark:bg-gray-900"
    >
      <div className="container mx-auto max-w-4xl">
        <motion.div
          className="text-center mb-16"
          ref={faqRef.ref}
          variants={fadeInUp}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t("faq.title")}
          </h2>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-lg font-semibold text-right">
                  {t(faq.questionKey)}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-gray-600 dark:text-gray-300 text-right">
                    {t(faq.answerKey)}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

