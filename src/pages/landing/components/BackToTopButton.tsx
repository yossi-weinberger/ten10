import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackToTopButtonProps {
  pageRef: React.RefObject<HTMLElement | null>;
  targetRef: React.RefObject<HTMLElement | null>;
}

const getScrollableParent = (element: HTMLElement | null) => {
  let parent = element?.parentElement ?? null;

  while (parent) {
    const { overflowY } = window.getComputedStyle(parent);
    const canScroll = parent.scrollHeight > parent.clientHeight;

    if (canScroll && (overflowY === "auto" || overflowY === "scroll")) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return window;
};

const getScrollTop = (scrollTarget: HTMLElement | Window) =>
  scrollTarget === window ? window.scrollY : scrollTarget.scrollTop;

export const BackToTopButton: React.FC<BackToTopButtonProps> = ({
  pageRef,
  targetRef,
}) => {
  const { t, i18n } = useTranslation("landing");
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const scrollTarget = getScrollableParent(pageRef.current);
    const handleScroll = () => {
      setShowButton(getScrollTop(scrollTarget) > 600);
    };

    handleScroll();
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
    };
  }, [pageRef]);

  const scrollToTop = () => {
    if (targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const scrollTarget = getScrollableParent(pageRef.current);
    scrollTarget.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {showButton && (
        <motion.div
          className={cn(
            "fixed bottom-6 z-40",
            i18n.dir() === "rtl" ? "right-6" : "left-6"
          )}
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Button
            type="button"
            size="icon"
            className="h-11 w-11 rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-lg hover:bg-emerald-50 dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
            onClick={scrollToTop}
            aria-label={t("backToTop")}
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
