import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { buttonHover, buttonTap } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  ChevronDown,
  Download,
  Globe,
  Loader2,
  Mail,
  Monitor,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePlatform } from "@/contexts/PlatformContext";
import { useLatestRelease, getVersionFromTag } from "@/hooks/useLatestRelease";

interface DownloadSectionProps {
  sectionRef: React.RefObject<HTMLElement | null>;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({
  sectionRef,
}) => {
  const { t } = useTranslation("landing");
  const { platform } = usePlatform();
  const [releaseEnabled, setReleaseEnabled] = useState(false);
  const { release, downloads, loading, error } = useLatestRelease({
    enabled: releaseEnabled,
  });
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [blockedUsersOpen, setBlockedUsersOpen] = useState(false);

  const version = release ? getVersionFromTag(release.tag_name) : null;
  const showBlockedUsersOption = platform === "desktop";
  return (
    <section
      id="download"
      ref={sectionRef}
      className="relative overflow-hidden bg-white px-4 py-16 dark:bg-gray-800 md:py-20"
    >
      <div className="absolute inset-0 bg-noise opacity-[0.035] dark:opacity-[0.04]" />

      <div className="container relative mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
            {t("cta.title")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-300">
            <span className="block">{t("cta.subtitle")}</span>
            <span className="mt-1 block text-base text-gray-500 dark:text-gray-400">
              {t("download.subtitle")}
            </span>
          </p>
        </motion.div>

        {error && (
          <div className="mx-auto mt-8 flex max-w-2xl items-center gap-3 border border-red-200 bg-red-50 p-4 text-start dark:border-red-800 dark:bg-red-950">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">
              {t("download.error")}
            </p>
          </div>
        )}

        <motion.div
          className="mx-auto mt-10 grid max-w-3xl gap-6 md:grid-cols-2"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          onViewportEnter={() => setReleaseEnabled(true)}
          transition={{ duration: 0.35, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex h-full flex-col border border-emerald-900/10 bg-[#fdfbf7]/80 p-6 text-center shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-emerald-500/30 hover:shadow-lg dark:border-emerald-100/10 dark:bg-gray-900/60">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Monitor className="h-7 w-7" strokeWidth={1.7} />
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              <h3 className="font-semibold text-gray-950 dark:text-white">
                {t("platforms.desktop.title")}
              </h3>
              <Badge variant="outline" className="text-xs">
                Windows
              </Badge>
              {version && (
                <Badge variant="outline" className="text-xs">
                  v{version}
                </Badge>
              )}
            </div>

            <div className="mt-5 space-y-2">
              {loading ? (
                <Button className="w-full" disabled>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("download.loading")}
                </Button>
              ) : downloads.windowsExe ? (
                <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                  <Button className="h-11 w-full bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500" asChild>
                    <a
                      href={downloads.windowsExe.browser_download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="me-2 h-4 w-4" />
                      {t("download.downloadButton")}
                      <Badge
                        variant="secondary"
                        className="ms-2 px-1.5 py-0 text-[10px]"
                      >
                        {t("download.recommended")}
                      </Badge>
                    </a>
                  </Button>
                </motion.div>
              ) : (
                <Button className="w-full" disabled>
                  {t("download.notAvailable")}
                </Button>
              )}

              <div
                className={
                  showBlockedUsersOption ? "grid grid-cols-2 gap-2" : "grid"
                }
              >
                <Popover
                  open={moreOptionsOpen}
                  onOpenChange={setMoreOptionsOpen}
                >
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t("download.moreOptions")}
                    <ChevronDown
                      className={`ms-1 h-3 w-3 opacity-70 transition-transform ${
                        moreOptionsOpen ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="center"
                  side="bottom"
                  sideOffset={8}
                  className="w-80 max-w-[calc(100vw-2rem)] p-3"
                >
                  <div className="space-y-2 text-start">
                    {downloads.windowsMsi && (
                      <div className="flex flex-col gap-2 border border-border px-3 py-2.5">
                        <span className="font-medium text-sm">
                          {t("download.optionMsi")}
                        </span>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {t("download.explainMsi")}
                        </p>
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={downloads.windowsMsi.browser_download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="me-1.5 h-3 w-3" />
                            {t("download.downloadButton")}
                          </a>
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 border border-border px-3 py-2.5">
                      <span className="font-medium text-sm">
                        {t("download.optionWebView2")}
                      </span>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t("download.explainWebView2")}
                      </p>
                      {downloads.windowsWithWebView2 ? (
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={
                              downloads.windowsWithWebView2.browser_download_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="me-1.5 h-3 w-3" />
                            {t("download.downloadButton")}
                          </a>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          {t("download.comingSoonWebView2")}
                        </Button>
                      )}
                    </div>

                  </div>
                </PopoverContent>
                </Popover>

                {showBlockedUsersOption && (
                  <Popover
                    open={blockedUsersOpen}
                    onOpenChange={setBlockedUsersOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="me-1.5 h-3.5 w-3.5" />
                        {t("download.blockedUsers")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="center"
                      side="bottom"
                      sideOffset={8}
                      className="w-80 max-w-[calc(100vw-2rem)] p-3"
                    >
                      <div className="flex flex-col gap-2 border border-border px-3 py-2.5 text-start">
                        <span className="flex items-center gap-2 font-medium text-sm">
                          <Mail className="h-3.5 w-3.5" />
                          {t("download.blockedUsersTitle")}
                        </span>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {t("download.blockedUsersDescription")}
                        </p>
                        <Button size="sm" variant="outline" asChild>
                          <a href="mailto:maaser@ten10-app.com">
                            <Mail className="me-1.5 h-3 w-3" />
                            maaser@ten10-app.com
                          </a>
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col border border-emerald-900/10 bg-white/80 p-6 text-center shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-primary/30 hover:shadow-lg dark:border-emerald-100/10 dark:bg-gray-900/60">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <Globe className="h-7 w-7" strokeWidth={1.7} />
            </div>

            <h3 className="mt-4 font-semibold text-gray-950 dark:text-white">
              {t("download.webCard.title")}
            </h3>

            <motion.div className="mt-5" whileHover={buttonHover} whileTap={buttonTap}>
              <Button className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <a
                  href="https://ten10-app.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center"
                >
                  <Globe className="me-2 h-4 w-4" />
                  {t("download.webCard.button")}
                </a>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
