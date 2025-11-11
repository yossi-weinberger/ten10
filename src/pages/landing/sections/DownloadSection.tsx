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
import { Badge } from "@/components/ui/badge";
import { Download, Globe, Monitor, Loader2, AlertCircle } from "lucide-react";
import { useLatestRelease, getVersionFromTag } from "@/hooks/useLatestRelease";

interface DownloadSectionProps {
  sectionRef: React.RefObject<HTMLElement>;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({
  sectionRef,
}) => {
  const { t } = useTranslation("landing");
  const downloadRef = useScrollAnimation({ threshold: 0.1 });
  const { release, downloads, loading, error } = useLatestRelease();

  const version = release ? getVersionFromTag(release.tag_name) : null;

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

        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 max-w-2xl mx-auto">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-200">
              {t("download.error")}
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Windows Download */}
          <motion.div
            variants={staggerItem}
            whileHover={{ y: -8 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <Card className="hover:shadow-xl transition-all duration-300 group hover:border-blue-200 dark:hover:border-blue-800 h-full">
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
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="font-semibold group-hover:text-blue-600 transition-colors duration-300">
                    Windows
                  </h3>
                  {version && (
                    <Badge variant="outline" className="text-xs">
                      v{version}
                    </Badge>
                  )}
                </div>
                <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                  {loading ? (
                    <Button className="w-full" disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("download.loading")}
                    </Button>
                  ) : downloads.windowsMsi || downloads.windowsExe ? (
                    <Button className="w-full" asChild>
                      <a
                        href={
                          downloads.windowsMsi?.browser_download_url ||
                          downloads.windowsExe?.browser_download_url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {t("download.downloadButton")}
                      </a>
                    </Button>
                  ) : (
                    <Button className="w-full" disabled>
                      <Download className="mr-2 h-4 w-4" />
                      {t("download.notAvailable")}
                    </Button>
                  )}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Web App */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.1,
              type: "spring",
              damping: 20,
              stiffness: 300,
            }}
            whileHover={{ y: -8 }}
            viewport={{ once: true }}
          >
            <Card className="hover:shadow-xl transition-all duration-300 border-2 border-green-500 group hover:border-green-400 animate-pulse-glow h-full">
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
                  {t("download.webCard.title")}
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
                      {t("download.webCard.button")}
                    </Link>
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Coming Soon Note */}
        <p className="mt-8 text-sm text-muted-foreground">
          {t("download.comingSoon")}
        </p>
      </div>
    </section>
  );
};
