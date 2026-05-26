import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buttonHover, buttonTap } from "@/hooks/useScrollAnimation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { navigationItems } from "../constants/navigationItems";

interface FloatingNavigationProps {
  showNavigation: boolean;
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

export const FloatingNavigation: React.FC<FloatingNavigationProps> = ({
  showNavigation,
  activeSection,
  onNavigate,
}) => {
  const { t, i18n } = useTranslation("landing");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!showNavigation) return null;

  const navGlassClasses =
    "border border-white/45 bg-white/35 shadow-[0_18px_45px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-2xl backdrop-saturate-200 dark:border-white/15 dark:bg-gray-950/40 dark:shadow-[0_18px_45px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]";

  return (
    <>
      <motion.nav
      initial={{ x: i18n.dir() === "rtl" ? 24 : -24, opacity: 0, scale: 0.98 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: i18n.dir() === "rtl" ? 24 : -24, opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-24 z-40 hidden max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl p-2 no-scrollbar lg:block ${navGlassClasses} ${
        i18n.dir() === "rtl" ? "right-4" : "left-4"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-3 top-2 h-px bg-white/70 dark:bg-white/10" />
      <div className="flex flex-col gap-2">
        <motion.button
          type="button"
          onClick={() => onNavigate("hero")}
          className="flex w-full items-center justify-center rounded-xl px-2 py-2 text-primary transition-colors hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/10"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label={t("nav.home")}
        >
          <img
            src="/logo/logo-wide.svg"
            alt=""
            aria-hidden="true"
            className="h-7 w-auto max-w-[4.75rem]"
          />
        </motion.button>

        <div className="h-px bg-border" aria-hidden="true" />

        {navigationItems.map((item, index) => (
          <motion.button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            whileHover={buttonHover}
            whileTap={buttonTap}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`rounded-xl px-3 py-2 text-start text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeSection === item.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            aria-label={t(item.labelKey, item.label)}
            title={t(item.labelKey, item.label)}
          >
            {t(item.labelKey, item.label)}
          </motion.button>
        ))}
      </div>
    </motion.nav>

      <Popover open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <PopoverTrigger asChild>
          <motion.div
            className={`fixed top-16 z-40 lg:hidden ${
              i18n.dir() === "rtl" ? "right-4" : "left-4"
            }`}
            initial={{ y: -16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <Button
              type="button"
              size="icon"
              className={`h-12 w-12 rounded-full text-primary ${navGlassClasses}`}
              aria-label={t("nav.home")}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </motion.div>
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          align={i18n.dir() === "rtl" ? "end" : "start"}
          sideOffset={8}
          className={`w-28 rounded-2xl p-1.5 ${navGlassClasses}`}
          dir={i18n.dir()}
        >
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate("hero");
              }}
              className="flex items-center justify-center rounded-xl px-2 py-2 text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img
                src="/logo/app-icon.svg"
                alt=""
                aria-hidden="true"
                className="h-7 w-7"
              />
            </button>

            <div className="my-1.5 h-px bg-border" aria-hidden="true" />

            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate(item.id);
                }}
                className={`rounded-xl px-2.5 py-2 text-start text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeSection === item.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t(item.labelKey, item.label)}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};
