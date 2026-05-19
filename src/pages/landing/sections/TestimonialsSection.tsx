import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { testimonials } from "../constants/testimonials";

interface TestimonialsSectionProps {
  sectionRef: React.RefObject<HTMLElement | null>;
}

/** Circular distance between two indices in an array of given length. */
function circularDist(a: number, b: number, len: number) {
  return Math.min(Math.abs(a - b), len - Math.abs(a - b));
}

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({
  sectionRef,
}) => {
  const { t } = useTranslation("landing");
  const headerRef = useScrollAnimation({ threshold: 0.1 });

  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track selected index from embla
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setSelectedIndex(carouselApi.selectedScrollSnap());
    carouselApi.on("select", onSelect);
    onSelect();
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  // Auto-play — pauses on hover
  useEffect(() => {
    if (!carouselApi || isPaused) return;
    autoplayRef.current = setInterval(() => carouselApi.scrollNext(), 5000);
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [carouselApi, isPaused]);

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className="py-20 px-4 bg-white dark:bg-gray-800"
    >
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-14" ref={headerRef.ref}>
          <motion.span
            className="text-blue-600 dark:text-blue-400 font-semibold tracking-wider uppercase text-sm mb-2 block"
            initial={{ opacity: 0, y: 10 }}
            animate={headerRef.isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.5 }}
          >
            {t("testimonials.eyebrow")}
          </motion.span>
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white"
            initial={{ opacity: 0, y: 24 }}
            animate={
              headerRef.isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }
            }
            transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.1 }}
          >
            {t("testimonials.title")}
          </motion.h2>
        </div>

        {/* Carousel */}
        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <Carousel
            opts={{ align: "center", loop: true, direction: "ltr" }}
            setApi={setCarouselApi}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {testimonials.map((testimonial, index) => {
                const dist = circularDist(index, selectedIndex, testimonials.length);
                const isCenter = dist === 0;
                const isAdjacent = dist === 1;

                return (
                  <CarouselItem
                    key={index}
                    className="pl-4 basis-[85%] sm:basis-1/2 md:basis-1/3"
                  >
                    <motion.div
                      className="h-full py-4"
                      animate={{
                        scale: isCenter ? 1.05 : isAdjacent ? 0.96 : 0.90,
                        opacity: isCenter ? 1 : isAdjacent ? 0.72 : 0.42,
                      }}
                      transition={{ type: "spring", damping: 28, stiffness: 280 }}
                    >
                      <Card
                        className={`h-full flex flex-col transition-shadow duration-300 cursor-default ${
                          isCenter
                            ? "shadow-2xl border-blue-300 dark:border-blue-600"
                            : "shadow-sm border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <CardContent className="pt-6 pb-5 px-6 flex flex-col h-full">
                          {/* Decorative quote mark */}
                          <div
                            className={`text-5xl font-serif leading-none mb-1 select-none ${
                              isCenter
                                ? "text-blue-400 dark:text-blue-500"
                                : "text-gray-200 dark:text-gray-700"
                            }`}
                          >
                            &#8220;
                          </div>

                          {/* Stars */}
                          <div className="flex gap-0.5 mb-3">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <Star
                                key={i}
                                className="h-4 w-4 fill-yellow-400 text-yellow-400"
                              />
                            ))}
                          </div>

                          {/* Quote text */}
                          <p
                            className={`flex-grow italic leading-relaxed mb-5 transition-colors duration-300 ${
                              isCenter
                                ? "text-gray-800 dark:text-gray-100 text-base"
                                : "text-gray-500 dark:text-gray-400 text-sm"
                            }`}
                          >
                            {t(testimonial.textKey)}
                          </p>

                          {/* Author */}
                          <div
                            className={`flex items-center gap-3 pt-4 border-t transition-colors duration-300 ${
                              isCenter
                                ? "border-blue-100 dark:border-blue-900/60"
                                : "border-gray-100 dark:border-gray-700"
                            }`}
                          >
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors duration-300 ${
                                isCenter
                                  ? "bg-blue-500 text-white"
                                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {t(testimonial.nameKey)[0]}
                            </div>
                            <p
                              className={`font-semibold transition-colors duration-300 ${
                                isCenter
                                  ? "text-gray-900 dark:text-white"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {t(testimonial.nameKey)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>

            <CarouselPrevious
              className="-left-4 md:-left-6 h-10 w-10 border-none bg-white/90 dark:bg-gray-800/90 backdrop-blur shadow-md hover:bg-white dark:hover:bg-gray-800"
              aria-label="Previous testimonial"
            />
            <CarouselNext
              className="-right-4 md:-right-6 h-10 w-10 border-none bg-white/90 dark:bg-gray-800/90 backdrop-blur shadow-md hover:bg-white dark:hover:bg-gray-800"
              aria-label="Next testimonial"
            />
          </Carousel>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center items-center gap-2 mt-8">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => carouselApi?.scrollTo(i)}
              aria-label={`Go to testimonial ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === selectedIndex
                  ? "w-6 h-2 bg-blue-500"
                  : "w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
