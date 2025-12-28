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

const MotionAccordionItem = motion.create(AccordionItem);

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
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t("faq.subtitle")}
          </p>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Accordion type="single" collapsible className="w-full grid gap-4">
            {faqs.map((faq, index) => (
              <MotionAccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <AccordionTrigger className="px-6 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg font-semibold text-gray-900 dark:text-white text-right data-[state=open]:text-primary">
                  {t(faq.questionKey)}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <p className="text-gray-600 dark:text-gray-300 text-right leading-relaxed">
                    {t(faq.answerKey)}
                  </p>
                </AccordionContent>
              </MotionAccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div className="mt-12 text-center" variants={fadeInUp}>
          <p className="text-gray-500 dark:text-gray-400">
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
