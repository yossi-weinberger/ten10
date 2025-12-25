import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";

export const ScreenshotCarousel: React.FC = () => {
  const { t } = useTranslation("landing");
  const [carouselProgress, setCarouselProgress] = useState(0);
  const [carouselApi, setCarouselApi] = useState<any>(null);

  // Carousel progress tracking
  useEffect(() => {
    if (!carouselApi) return;

    const updateProgress = () => {
      const progress = Math.max(
        0,
        Math.min(100, carouselApi.scrollProgress() * 100)
      );
      setCarouselProgress(progress);
    };

    carouselApi.on("scroll", updateProgress);
    updateProgress();

    return () => {
      carouselApi.off("scroll", updateProgress);
    };
  }, [carouselApi]);

  const screenshots = [
    {
      key: "dashboard",
      titleKey: "carousel.dashboard",
      // User will upload images later. Placeholder for now.
      src: "/screenshots/dashboard-placeholder.png",
      alt: "Ten10 Dashboard",
    },
    {
      key: "transactions",
      titleKey: "carousel.transactions",
      src: "/screenshots/transactions-placeholder.png",
      alt: "Ten10 Transactions",
    },
    {
      key: "reports",
      titleKey: "carousel.reports",
      src: "/screenshots/reports-placeholder.png",
      alt: "Ten10 Reports",
    },
  ];

  return (
    <motion.div
      className="relative mx-auto max-w-5xl"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
    >
      <Carousel
        className="w-full"
        opts={{ align: "center", loop: true }}
        setApi={setCarouselApi}
      >
        <CarouselContent>
          {screenshots.map((item, index) => (
            <CarouselItem key={item.key}>
              <div className="flex flex-col gap-6 p-4">
                {/* Text Content - Moved above image */}
                <div className="text-center space-y-2">
                  <motion.h3
                    className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    {t(item.titleKey)}
                  </motion.h3>
                  {/* If there is a description in translation, we can add it here. 
                      Currently the key used for title seems to be the description in the JSON.
                      Let's check the JSON content.
                      "carousel": {
                        "dashboard": "תצוגה כללית של המצב הפיננסי",
                        ...
                      }
                      So the titleKey actually points to a description string.
                      The user said "move the description above". 
                  */}
                </div>

                {/* Image Container */}
                <motion.div
                  className="relative rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 aspect-video group"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                >
                  {/* Placeholder Background if image is missing */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-600 font-medium">
                      Image: {item.alt}
                    </span>
                  </div>

                  {/* Actual Image Tag - User will replace src */}
                  <img
                    src={item.src}
                    alt={item.alt}
                    className="relative w-full h-full object-cover object-top opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    onError={(e) => {
                      // Keep opacity 0 if failed to load so placeholder shows
                      (e.target as HTMLImageElement).style.opacity = "0";
                    }}
                    onLoad={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "1";
                    }}
                  />

                  {/* Overlay for depth */}
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-xl pointer-events-none" />
                </motion.div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="-left-4 md:-left-12 h-12 w-12 border-none bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-lg hover:bg-white dark:hover:bg-gray-800" />
        <CarouselNext className="-right-4 md:-right-12 h-12 w-12 border-none bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-lg hover:bg-white dark:hover:bg-gray-800" />
      </Carousel>

      {/* Progress Bar */}
      <motion.div className="mt-8 max-w-xs mx-auto">
        <Progress value={carouselProgress} className="h-1.5" />
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
          {t("carousel.swipeHint")}
        </p>
      </motion.div>
    </motion.div>
  );
};
