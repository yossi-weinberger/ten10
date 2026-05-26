import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink, Landmark, ScrollText } from "lucide-react";

interface AboutSectionProps {
  sectionRef: React.RefObject<HTMLElement | null>;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ sectionRef }) => {
  const { t, i18n } = useTranslation("landing");
  const shouldReduceMotion = useReducedMotion();
  const endorsementQuote = String(t("about.endorsements.quote1"));
  const quoteMark = "״";
  const endorsementWords = endorsementQuote.split(" ");

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative overflow-hidden bg-[#fdfbf7] px-4 py-16 text-gray-950 dark:bg-gray-950 dark:text-gray-50 md:py-20"
      dir={i18n.dir()}
    >
      <div className="absolute inset-0 bg-noise opacity-[0.06] dark:opacity-[0.04]" />
      <div className="absolute inset-x-0 top-0 h-px bg-emerald-900/10 dark:bg-emerald-100/10" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-emerald-900/10 dark:bg-emerald-100/10" />

      <div className="container relative mx-auto max-w-7xl">
        <motion.div
          className="mx-auto max-w-6xl"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-gray-950 dark:text-white md:text-5xl">
              {t("about.title")}
            </h2>

            <p className="mt-5 text-lg leading-relaxed text-gray-600 dark:text-gray-300">
              {t("about.subtitle")}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch">
            <div className="border border-emerald-900/10 bg-white/80 p-6 shadow-sm dark:border-emerald-100/10 dark:bg-gray-900/55 md:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Landmark className="h-5 w-5" strokeWidth={1.7} />
                </div>
                <div className="min-w-0 text-start">
                  <h3 className="text-xl font-bold text-gray-950 dark:text-white">
                    {t("about.partnership.title")}
                  </h3>
                  <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-300">
                    {t("about.partnership.description")}
                  </p>

                  <div className="mt-6 flex flex-col gap-4 border-t border-emerald-900/10 pt-4 dark:border-emerald-100/10 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle className="h-5 w-5" strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-950 dark:text-white">
                          {t("about.partnership.verified")}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {t("about.partnership.institute")}
                        </p>
                      </div>
                    </div>

                    <Button
                      asChild
                      className="h-11 min-w-[170px] border-none bg-golden-static px-5 text-base font-semibold text-accent-foreground shadow-[0_0_16px_rgba(218,165,32,0.24)] brightness-95 saturate-110 transition-all duration-300 hover:bg-golden-hover hover:brightness-100 hover:shadow-[0_0_22px_rgba(218,165,32,0.36)]"
                    >
                      <a
                        href="https://veahavta-kamocha.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center"
                      >
                        {t("about.partnership.visitWebsite")}
                        <ExternalLink className="ms-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <motion.figure
              className="relative flex min-h-[22rem] overflow-hidden border border-emerald-900/20 bg-emerald-950 p-6 text-white shadow-xl shadow-emerald-950/15 dark:border-emerald-100/10 md:p-8"
              viewport={{ once: true, margin: "0px 0px -80px 0px" }}
            >
              <img
                src="/background.webp"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover opacity-45"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/90 via-emerald-950/82 to-emerald-800/78" />
              <div className="absolute inset-0 bg-noise opacity-10" />
              <div className="pointer-events-none absolute inset-4 border border-amber-200/15" />
              <div className="pointer-events-none absolute -start-10 top-8 h-40 w-40 rounded-full border border-amber-200/20" />
              <div className="pointer-events-none absolute bottom-8 end-8 h-24 w-24 rounded-full border border-amber-200/10" />

              <div className="relative flex w-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-start">
                    <p className="text-sm font-semibold tracking-[0.16em] text-amber-100">
                      {t("about.endorsements.title")}
                    </p>
                    <div className="mt-3 h-px w-24 bg-amber-200/45" />
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-200/40 bg-amber-100/10 text-amber-100">
                    <ScrollText className="h-5 w-5" strokeWidth={1.7} />
                  </div>
                </div>

                <span
                  className="pointer-events-none absolute start-4 top-16 text-[7rem] font-bold leading-none text-amber-100/20"
                  aria-hidden="true"
                >
                  ״
                </span>

                <blockquote className="relative my-auto px-2 py-10 text-center text-xl font-semibold leading-relaxed text-white md:px-8 md:text-2xl">
                  <span className="sr-only">
                    {quoteMark}
                    {endorsementQuote}
                    {quoteMark}
                  </span>
                  <motion.span
                    aria-hidden="true"
                    initial={shouldReduceMotion ? false : "hidden"}
                    whileInView={shouldReduceMotion ? undefined : "visible"}
                    viewport={{
                      once: true,
                      margin: "0px 0px -80px 0px",
                    }}
                    variants={{
                      hidden: {},
                      visible: {
                        transition: {
                          staggerChildren: 0.035,
                          delayChildren: 0.2,
                        },
                      },
                    }}
                  >
                    {shouldReduceMotion
                      ? `${quoteMark}${endorsementQuote}${quoteMark}`
                      : endorsementWords.map((word, wordIndex) => {
                          const animatedWord = `${wordIndex === 0 ? quoteMark : ""}${word}${
                            wordIndex === endorsementWords.length - 1
                              ? quoteMark
                              : ""
                          }`;

                          return (
                            <span
                              key={`${word}-${wordIndex}`}
                              className={`inline-block ${
                                wordIndex < endorsementWords.length - 1
                                  ? "me-[0.25em]"
                                  : ""
                              }`}
                            >
                              {Array.from(animatedWord).map(
                                (character, charIndex) => (
                                  <motion.span
                                    key={`${character}-${wordIndex}-${charIndex}`}
                                    className="inline-block"
                                    variants={{
                                      hidden: { opacity: 0, y: 8 },
                                      visible: { opacity: 1, y: 0 },
                                    }}
                                    transition={{
                                      duration: 0.08,
                                      ease: [0.22, 1, 0.36, 1],
                                    }}
                                  >
                                    {character}
                                  </motion.span>
                                )
                              )}
                            </span>
                          );
                        })}
                  </motion.span>
                </blockquote>

                <figcaption className="relative border-t border-amber-100/20 pt-4 text-center text-base font-semibold text-amber-50 md:text-lg">
                  {t("about.endorsements.rabbi1")}
                </figcaption>
              </div>

            </motion.figure>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
