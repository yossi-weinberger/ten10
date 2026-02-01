import { useState } from "react";
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
import {
  Download,
  Globe,
  Monitor,
  Loader2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

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
            {t("cta.title")}
          </motion.h2>
          <motion.p
            className="text-xl text-gray-600 dark:text-gray-300 mb-12"
            variants={fadeInUp}
          >
            <span className="block">{t("cta.subtitle")}</span>
            <span className="block mt-2 text-base text-gray-500 dark:text-gray-400">
              {t("download.subtitle")}
            </span>
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
          {/* Windows Download - three options: EXE (recommended), MSI, With WebView2 */}
          <motion.div
            variants={staggerItem}
            whileHover={{ y: -8 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <Card className="hover:shadow-xl transition-all duration-300 group hover:border-blue-200 dark:hover:border-blue-800 h-full">
              <CardContent className="pt-4 pb-4 text-center">
                <motion.div>
                  <Monitor className="h-10 w-10 mx-auto mb-2 text-blue-600 group-hover:text-blue-700 transition-colors duration-300" />
                </motion.div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="font-semibold text-sm group-hover:text-blue-600 transition-colors duration-300">
                    Windows
                  </h3>
                  {version && (
                    <Badge variant="outline" className="text-xs">
                      v{version}
                    </Badge>
                  )}
                </div>
                {loading ? (
                  <Button className="w-full" size="sm" disabled>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    {t("download.loading")}
                  </Button>
                ) : (
                  <div className="space-y-2 text-left">
                    {/* Main: EXE (recommended) when available */}
                    {downloads.windowsExe && (
                      <>
                        <p className="text-xs text-muted-foreground text-center">
                          {t("download.explainExe")}
                        </p>
                        <motion.div
                          whileHover={buttonHover}
                          whileTap={buttonTap}
                        >
                          <Button className="w-full" asChild>
                            <a
                              href={downloads.windowsExe.browser_download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              {t("download.downloadButton")}{" "}
                              <Badge
                                variant="secondary"
                                className="ml-2 text-[10px] px-1.5 py-0"
                              >
                                {t("download.recommended")}
                              </Badge>
                            </a>
                          </Button>
                        </motion.div>
                      </>
                    )}
                    {/* Popover: MSI + WebView2 – show when EXE exists (as "More options") or when only MSI/WebView2 exist (as "Download options") */}
                    {(downloads.windowsExe ||
                      downloads.windowsMsi ||
                      downloads.windowsWithWebView2) && (
                      <Popover
                        open={moreOptionsOpen}
                        onOpenChange={setMoreOptionsOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant={downloads.windowsExe ? "ghost" : "default"}
                            size="sm"
                            className={
                              downloads.windowsExe
                                ? "w-full text-xs text-muted-foreground hover:text-foreground"
                                : "w-full"
                            }
                          >
                            {downloads.windowsExe
                              ? t("download.moreOptions")
                              : t("download.downloadButton")}
                            <ChevronDown
                              className={`ml-1 h-3 w-3 opacity-70 transition-transform ${
                                moreOptionsOpen ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="center"
                          side="bottom"
                          sideOffset={6}
                          className="w-80 max-w-[calc(100vw-2rem)] p-3"
                        >
                          <div className="space-y-2">
                            {downloads.windowsMsi && (
                              <div className="rounded-md border border-border px-2.5 py-2 flex flex-col gap-1">
                                <span className="font-medium text-xs">
                                  {t("download.optionMsi")}
                                </span>
                                <p className="text-[11px] text-muted-foreground leading-tight">
                                  {t("download.explainMsi")}
                                </p>
                                <motion.div
                                  className="mt-0.5"
                                  whileHover={buttonHover}
                                  whileTap={buttonTap}
                                >
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs w-full"
                                    asChild
                                  >
                                    <a
                                      href={
                                        downloads.windowsMsi
                                          .browser_download_url
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Download className="mr-1.5 h-3 w-3" />
                                      {t("download.downloadButton")}
                                    </a>
                                  </Button>
                                </motion.div>
                              </div>
                            )}
                            <div className="rounded-md border border-border px-2.5 py-2 flex flex-col gap-1">
                              <span className="font-medium text-xs">
                                {t("download.optionWebView2")}
                              </span>
                              <p className="text-[11px] text-muted-foreground leading-tight">
                                {t("download.explainWebView2")}
                              </p>
                              {downloads.windowsWithWebView2 ? (
                                <motion.div
                                  className="mt-0.5"
                                  whileHover={buttonHover}
                                  whileTap={buttonTap}
                                >
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs w-full"
                                    asChild
                                  >
                                    <a
                                      href={
                                        downloads.windowsWithWebView2
                                          .browser_download_url
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Download className="mr-1.5 h-3 w-3" />
                                      {t("download.downloadButton")}
                                    </a>
                                  </Button>
                                </motion.div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs w-full"
                                  disabled
                                >
                                  {t("download.comingSoonWebView2")}
                                </Button>
                              )}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    {!downloads.windowsExe &&
                      !downloads.windowsMsi &&
                      !downloads.windowsWithWebView2 && (
                        <p className="text-sm text-muted-foreground pt-2">
                          {t("download.notAvailable")}
                        </p>
                      )}
                  </div>
                )}
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
                // Removed rotation animation
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
