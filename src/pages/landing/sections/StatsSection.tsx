import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export const StatsSection: React.FC = () => {
  const { t } = useTranslation("landing");
  const sectionRootRef = useRef<HTMLDivElement | null>(null);
  const [downloadsCount, setDownloadsCount] = useState(0);
  const [websiteUsersCount, setWebsiteUsersCount] = useState(0);

  useEffect(() => {
    const root = sectionRootRef.current;
    if (!root) return;

    let hasStarted = false;
    const timeouts: number[] = [];
    const frames: number[] = [];

    const animateCount = (
      end: number,
      setValue: React.Dispatch<React.SetStateAction<number>>,
      delay = 0
    ) => {
      const timeoutId = window.setTimeout(() => {
        const duration = 1800;
        const startTime = performance.now();

        const animate = (time: number) => {
          const progress = Math.min((time - startTime) / duration, 1);
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          setValue(Math.floor(end * easedProgress));

          if (progress < 1) {
            const frameId = requestAnimationFrame(animate);
            frames.push(frameId);
          }
        };

        const frameId = requestAnimationFrame(animate);
        frames.push(frameId);
      }, delay);

      timeouts.push(timeoutId);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasStarted) return;
        hasStarted = true;
        animateCount(1850, setDownloadsCount, 150);
        animateCount(2450, setWebsiteUsersCount, 300);
        observer.disconnect();
      },
      { threshold: 0.3 }
    );

    observer.observe(root);

    return () => {
      observer.disconnect();
      timeouts.forEach(window.clearTimeout);
      frames.forEach(cancelAnimationFrame);
    };
  }, []);

  return (
    <section className="relative overflow-hidden border-y border-border bg-card/60 px-4 py-10 text-card-foreground dark:bg-card/40">
      <div className="absolute inset-0 bg-noise opacity-[0.035] dark:opacity-[0.03]" />

      <div ref={sectionRootRef} className="container relative z-10 mx-auto max-w-4xl">
        <motion.div
          className="grid gap-6 text-center md:grid-cols-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.08 },
            },
          }}
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-2 text-4xl font-bold tabular-nums text-primary">
              {downloadsCount.toLocaleString()}+
            </div>
            <p className="text-sm font-medium text-muted-foreground md:text-base">
              {t("stats.downloads")}
            </p>
          </motion.div>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-2 text-4xl font-bold tabular-nums text-primary">
              {websiteUsersCount.toLocaleString()}+
            </div>
            <p className="text-sm font-medium text-muted-foreground md:text-base">
              {t("stats.websiteUsers")}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
