import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export const QuotesSection: React.FC = () => {
  const { t, i18n } = useTranslation("landing");

  return (
    <section
      className="relative overflow-hidden px-4 py-14 md:py-16 bg-[#fdfbf7] text-emerald-950 dark:bg-gray-950 dark:text-emerald-50"
      dir={i18n.dir()}
    >
      <div className="absolute inset-0 bg-noise opacity-[0.08] dark:opacity-[0.05]" />
      <div className="absolute inset-x-0 top-0 h-px bg-emerald-900/10 dark:bg-emerald-100/10" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-emerald-900/10 dark:bg-emerald-100/10" />

      <div className="container relative mx-auto max-w-7xl">
        <motion.div
          className="relative mx-auto max-w-6xl px-4 py-7 md:px-10 md:py-9"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="pointer-events-none absolute inset-0 border border-emerald-900/10 dark:border-emerald-100/10" />
          <div className="pointer-events-none absolute end-4 top-4 h-10 w-10 border-t border-e border-amber-700/30 dark:border-amber-300/30" />
          <div className="pointer-events-none absolute bottom-4 start-4 h-10 w-10 border-b border-s border-amber-700/30 dark:border-amber-300/30" />
          <span
            className="pointer-events-none absolute -top-8 end-8 text-[7rem] font-bold leading-none text-emerald-900/[0.05] dark:text-emerald-100/[0.05] md:text-[10rem]"
            aria-hidden="true"
          >
            ״
          </span>

          <div className="relative text-center">
            <h2 className="text-xl font-bold text-emerald-950 dark:text-emerald-50 md:text-2xl">
              {t("quotes.title")}
            </h2>
            <div className="mx-auto mt-3 h-px w-20 bg-amber-700/30 dark:bg-amber-300/30" />
          </div>

          <figure className="relative mx-auto mt-7 max-w-5xl text-center">
            <blockquote className="text-[clamp(1.45rem,3.2vw,2.9rem)] font-bold leading-[1.32] tracking-tight text-emerald-950 dark:text-emerald-50">
              <span aria-hidden="true">״</span>
              {t("quotes.main")}
              <span aria-hidden="true">״</span>
            </blockquote>

            <figcaption className="mt-4 text-sm font-semibold text-emerald-900/70 dark:text-emerald-100/70">
              {t("quotes.source")}
            </figcaption>
          </figure>

          <div className="relative mx-auto mt-8 grid max-w-5xl gap-6 border-t border-emerald-900/10 pt-6 dark:border-emerald-100/10 md:grid-cols-2 md:gap-10">
            <figure className="text-start">
              <blockquote className="text-sm font-semibold leading-relaxed text-emerald-950/85 dark:text-emerald-50/90 md:text-base">
                <span aria-hidden="true">״</span>
                {t("quotes.chazal1")}
                <span aria-hidden="true">״</span>
              </blockquote>
              <figcaption className="mt-2 text-xs md:text-sm text-emerald-900/55 dark:text-emerald-100/55">
                {t("quotes.chazalSource1")}
              </figcaption>
            </figure>

            <figure className="text-start">
              <blockquote className="text-sm font-semibold leading-relaxed text-emerald-950/85 dark:text-emerald-50/90 md:text-base">
                <span aria-hidden="true">״</span>
                {t("quotes.chazal2")}
                <span aria-hidden="true">״</span>
              </blockquote>
              <figcaption className="mt-2 text-xs md:text-sm text-emerald-900/55 dark:text-emerald-100/55">
                {t("quotes.chazalSource2")}
              </figcaption>
            </figure>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
