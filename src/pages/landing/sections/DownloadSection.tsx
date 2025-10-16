import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import {
  useScrollAnimation,
  fadeInUp,
  staggerItem,
  buttonHover,
  buttonTap,
} from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Globe, Monitor } from "lucide-react";

interface DownloadSectionProps {
  sectionRef: React.RefObject<HTMLElement>;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({
  sectionRef,
}) => {
  const { t } = useTranslation("landing");
  const downloadRef = useScrollAnimation({ threshold: 0.1 });

  return (
    <section
      id="download"
      ref={sectionRef}
      className="py-20 px-4 bg-white dark:bg-gray-800"
    >
      <div className="container mx-auto max-w-4xl text-center">
        <motion.div ref={downloadRef.ref}>
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8"
            variants={fadeInUp}
          >
            {t("download.title")}
          </motion.h2>
          <motion.p
            className="text-xl text-gray-600 dark:text-gray-300 mb-12"
            variants={fadeInUp}
          >
            {t("download.subtitle")}
          </motion.p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <motion.div
            variants={staggerItem}
            whileHover={{ y: -8 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <Card className="hover:shadow-xl transition-all duration-300 group hover:border-blue-200 dark:hover:border-blue-800">
              <CardContent className="pt-6 text-center">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Monitor className="h-12 w-12 mx-auto mb-4 text-blue-600 group-hover:text-blue-700 transition-colors duration-300" />
                </motion.div>
                <h3 className="font-semibold mb-2 group-hover:text-blue-600 transition-colors duration-300">
                  Windows
                </h3>
                <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                  <Button className="w-full" asChild>
                    <a href="/downloads/Ten10-Windows.msi" download>
                      <Download className="mr-2 h-4 w-4" />
                      {t("download.downloadButton")}
                    </a>
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={staggerItem}
            whileHover={{ y: -8 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <Card className="hover:shadow-xl transition-all duration-300 group hover:border-blue-200 dark:hover:border-blue-800">
              <CardContent className="pt-6 text-center">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, -5, 5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5,
                  }}
                >
                  <Monitor className="h-12 w-12 mx-auto mb-4 text-blue-600 group-hover:text-blue-700 transition-colors duration-300" />
                </motion.div>
                <h3 className="font-semibold mb-2 group-hover:text-blue-600 transition-colors duration-300">
                  macOS
                </h3>
                <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                  <Button className="w-full" asChild>
                    <a href="/downloads/Ten10-macOS.dmg" download>
                      <Download className="mr-2 h-4 w-4" />
                      {t("download.downloadButton")}
                    </a>
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={staggerItem}
            whileHover={{ y: -8 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <Card className="hover:shadow-xl transition-all duration-300 group hover:border-blue-200 dark:hover:border-blue-800">
              <CardContent className="pt-6 text-center">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                >
                  <Monitor className="h-12 w-12 mx-auto mb-4 text-blue-600 group-hover:text-blue-700 transition-colors duration-300" />
                </motion.div>
                <h3 className="font-semibold mb-2 group-hover:text-blue-600 transition-colors duration-300">
                  Linux
                </h3>
                <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                  <Button className="w-full" asChild>
                    <a href="/downloads/Ten10-Linux.AppImage" download>
                      <Download className="mr-2 h-4 w-4" />
                      {t("download.downloadButton")}
                    </a>
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 3 * 0.1,
              type: "spring",
              damping: 20,
              stiffness: 300,
            }}
            whileHover={{ y: -8 }}
            viewport={{ once: true }}
          >
            <Card className="hover:shadow-xl transition-all duration-300 border-2 border-green-500 group hover:border-green-400 animate-pulse-glow">
              <CardContent className="pt-6 text-center">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                    scale: {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }}
                >
                  <Globe className="h-12 w-12 mx-auto mb-4 text-green-600 group-hover:text-green-700 transition-colors duration-300" />
                </motion.div>
                <h3 className="font-semibold mb-2 group-hover:text-green-600 transition-colors duration-300">
                  {t("download.webCard.title", "אפליקציית ווב")}
                </h3>
                <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    asChild
                  >
                    <Link
                      to="/"
                      className="inline-flex items-center justify-center"
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      {t("download.webCard.button", "פתח כעת")}
                    </Link>
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
