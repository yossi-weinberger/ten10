import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Users } from "lucide-react";
import { testimonials } from "../constants/testimonials";

interface TestimonialsSectionProps {
  sectionRef: React.RefObject<HTMLElement>;
}

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({
  sectionRef,
}) => {
  const { t } = useTranslation("landing");
  const testimonialsRef = useScrollAnimation({ threshold: 0.1 });

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className="py-20 px-4 bg-white dark:bg-gray-800"
    >
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16" ref={testimonialsRef.ref}>
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
            initial={{ opacity: 0, y: 30 }}
            animate={
              testimonialsRef.isInView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 30 }
            }
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            {t("testimonials.title")}
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.1,
                type: "spring",
                damping: 20,
                stiffness: 300,
              }}
              whileHover={{ y: -8 }}
              viewport={{ once: true }}
            >
              <Card className="hover:shadow-xl transition-all duration-300 hover:border-blue-200 dark:hover:border-blue-800 group">
                <CardContent className="pt-6">
                  <motion.div
                    className="flex mb-4"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, rotate: -180 }}
                        whileInView={{ opacity: 1, rotate: 0 }}
                        transition={{ delay: index * 0.1 + i * 0.1 }}
                        whileHover={{ scale: 1.2, rotate: 10 }}
                      >
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      </motion.div>
                    ))}
                  </motion.div>
                  <motion.p
                    className="text-gray-600 dark:text-gray-300 mb-4 italic group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                  >
                    "{t(testimonial.textKey)}"
                  </motion.p>
                  <motion.div
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                  >
                    <motion.div
                      className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors duration-300"
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{
                        type: "spring",
                        damping: 20,
                        stiffness: 300,
                      }}
                    >
                      <Users className="h-5 w-5 text-blue-600" />
                    </motion.div>
                    <div>
                      <p className="font-semibold group-hover:text-blue-600 transition-colors duration-300">
                        {t(testimonial.nameKey)}
                      </p>
                    </div>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
