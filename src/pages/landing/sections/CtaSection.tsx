import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import {
  useScrollAnimation,
  fadeInUp,
  staggerContainer,
  staggerItem,
  buttonHover,
  buttonTap,
} from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { Download, Globe } from "lucide-react";

export const CtaSection: React.FC = () => {
  const { t } = useTranslation("landing");
  const ctaRef = useScrollAnimation({ threshold: 0.1 });

  return (
    <motion.section
      className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-700 text-white"
      ref={ctaRef.ref}
      initial="hidden"
      animate={ctaRef.isInView ? "visible" : "hidden"}
      variants={staggerContainer}
    >
      <div className="container mx-auto max-w-4xl text-center">
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-4"
          variants={fadeInUp}
        >
          {t("cta.title")}
        </motion.h2>
        <motion.p className="text-xl mb-8 text-blue-100" variants={fadeInUp}>
          {t("cta.subtitle")}
        </motion.p>
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={staggerItem}>
            <motion.div whileHover={buttonHover} whileTap={buttonTap}>
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8 py-3"
                onClick={() => {
                  // Scroll to download section
                  document
                    .getElementById("download")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Download className="mr-2 h-5 w-5" />
                {t("cta.desktopButton")}
              </Button>
            </motion.div>
          </motion.div>

          <motion.div variants={staggerItem}>
            <motion.div whileHover={buttonHover} whileTap={buttonTap}>
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8 py-3"
                asChild
              >
                <Link to="/" className="inline-flex items-center">
                  <Globe className="mr-2 h-5 w-5" />
                  {t("cta.webButton")}
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
};
