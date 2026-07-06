import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Quote, ArrowLeft, ArrowRight } from "lucide-react";
import { testimonials } from "../constants/testimonials";
import { cn } from "@/lib/utils";

interface TestimonialsSectionProps {
  sectionRef: React.RefObject<HTMLElement | null>;
}

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({
  sectionRef,
}) => {
  const { t, i18n } = useTranslation("landing");
  const isRtl = i18n.dir() === "rtl";
  const PreviousIcon = isRtl ? ArrowRight : ArrowLeft;
  const NextIcon = isRtl ? ArrowLeft : ArrowRight;

  const [api, setApi] = useState<CarouselApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    const syncState = () => {
      setCount(api.scrollSnapList().length);
      setSelectedIndex(api.selectedScrollSnap());
    };
    api.on("select", syncState);
    api.on("reInit", syncState);
    syncState();

    return () => {
      api.off("select", syncState);
      api.off("reInit", syncState);
    };
  }, [api]);

  useEffect(() => {
    api?.reInit();
  }, [api, isRtl]);

  const scrollTo = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api]
  );

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className="py-20 px-4 bg-white dark:bg-gray-800"
    >
      <div className="container relative mx-auto max-w-7xl">
        {/* Section heading */}
        <div className="text-center mb-14">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -80px 0px" }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
          >
            {t("testimonials.title")}
          </motion.h2>
        </div>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -80px 0px" }}
          transition={{ type: "spring", damping: 22, stiffness: 280, delay: 0.15 }}
        >
          <Carousel
            className="w-full [&>div:first-child]:overflow-visible"
            opts={{
              align: "center",
              loop: true,
              direction: isRtl ? "rtl" : "ltr",
            }}
            setApi={setApi}
          >
            {/* py-8 gives vertical breathing room for the active card's shadow. */}
            <CarouselContent
              className="py-8 !-ms-4 !ml-0"
              style={{ direction: isRtl ? "rtl" : "ltr" }}
            >
              {testimonials.map((testimonial, index) => {
                const isActive = index === selectedIndex;
                return (
                  // Fixed height prevents section height from jumping between cards.
                  <CarouselItem
                    key={index}
                    className="!ps-4 !pl-0 basis-[85%] sm:basis-[60%] lg:basis-[38%] h-64 sm:h-60"
                  >
                    <div
                      dir={i18n.dir()}
                      className={cn(
                        "flex flex-col h-full rounded-2xl border p-7",
                        // Only transition compositor-friendly properties, not layout.
                        "motion-safe:transition-[transform,opacity,box-shadow,border-color]",
                        "motion-safe:duration-500 motion-safe:ease-out",
                        "will-change-transform",
                        isActive
                          ? "bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-800 shadow-[0_8px_40px_-8px_rgba(16,185,129,0.22)] dark:shadow-[0_8px_40px_-8px_rgba(16,185,129,0.18)] scale-[1.03] opacity-100"
                          : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 shadow-sm scale-[0.92] opacity-65"
                      )}
                    >
                      {/* Quote icon */}
                      <Quote
                        className={cn(
                          "w-6 h-6 mb-3 shrink-0",
                          "motion-safe:transition-colors motion-safe:duration-300",
                          isActive
                            ? "text-emerald-500 dark:text-emerald-400"
                            : "text-gray-300 dark:text-gray-700"
                        )}
                        aria-hidden="true"
                      />

                      <div className="flex flex-1 items-center justify-center overflow-hidden">
                        <p
                          className={cn(
                            "leading-relaxed text-center",
                            "motion-safe:transition-[color,opacity] motion-safe:duration-300",
                            isActive
                              ? "text-gray-800 dark:text-gray-100 text-base md:text-lg opacity-100"
                              : "text-gray-500 dark:text-gray-400 text-sm md:text-base opacity-80"
                          )}
                        >
                          {t(testimonial.textKey)}
                        </p>
                      </div>

                      {/* Name uses text-end: left in Hebrew, right in English, like a signature. */}
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <p
                          className={cn(
                            "text-end text-sm font-semibold",
                            "motion-safe:transition-colors motion-safe:duration-300",
                            isActive
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-400 dark:text-gray-600"
                          )}
                        >
                          {t(testimonial.nameKey)}
                        </p>
                      </div>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </motion.div>

        {/* Dot navigation */}
        {count > 0 && (
          <div className="flex flex-col items-center gap-2 mt-4">
            <div
              className="flex items-center justify-center gap-4"
              dir={i18n.dir()}
              aria-label={t("testimonials.title")}
            >
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm motion-safe:transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-emerald-700 dark:hover:bg-emerald-950"
                onClick={() => api?.scrollPrev()}
                aria-label={t("testimonials.prev")}
              >
                <PreviousIcon className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
              </button>

              <div
                className="flex justify-center gap-1.5"
                aria-label={t("testimonials.title")}
              >
                {Array.from({ length: count }).map((_, index) => (
                  <button
                    key={index}
                    aria-current={index === selectedIndex ? "true" : undefined}
                    aria-label={`${index + 1}`}
                    onClick={() => scrollTo(index)}
                    className={cn(
                      "rounded-full motion-safe:transition-all motion-safe:duration-300",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                      index === selectedIndex
                        ? "w-5 h-2 bg-emerald-500 dark:bg-emerald-400"
                        : "w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                    )}
                  />
                ))}
              </div>

              <button
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm motion-safe:transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-emerald-700 dark:hover:bg-emerald-950"
                onClick={() => api?.scrollNext()}
                aria-label={t("testimonials.next")}
              >
                <NextIcon className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-600 sm:hidden">
              {t("testimonials.swipeHint")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
