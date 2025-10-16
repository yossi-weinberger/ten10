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
import { Calculator, FileText, PieChart } from "lucide-react";

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

  return (
    <motion.div
      className="relative mx-auto max-w-4xl"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        <Carousel
          className="w-full"
          opts={{ align: "start", loop: true }}
          setApi={setCarouselApi}
        >
          <CarouselContent>
            {/* Dashboard Screenshot */}
            <CarouselItem>
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 border hover-lift gpu-accelerated"
                whileHover={{ y: -5 }}
                transition={{
                  type: "spring",
                  damping: 20,
                  stiffness: 300,
                }}
              >
                <motion.div
                  className="flex items-center gap-2 mb-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.div
                    className="w-3 h-3 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div
                    className="w-3 h-3 bg-yellow-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: 0.3,
                    }}
                  />
                  <motion.div
                    className="w-3 h-3 bg-green-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: 0.6,
                    }}
                  />
                  <span className="ml-4 text-sm text-gray-500">
                    Ten10 Dashboard
                  </span>
                </motion.div>
                <motion.div
                  className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg p-8 text-center aspect-video flex items-center justify-center animate-gradient"
                  whileHover={{ scale: 1.05 }}
                  transition={{
                    type: "spring",
                    damping: 20,
                    stiffness: 300,
                  }}
                >
                  <div>
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        rotate: {
                          duration: 10,
                          repeat: Infinity,
                          ease: "linear",
                        },
                        scale: { duration: 2, repeat: Infinity },
                      }}
                    >
                      <Calculator className="h-16 w-16 mx-auto mb-4 text-blue-600" />
                    </motion.div>
                    <motion.h3
                      className="text-2xl font-bold mb-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      Dashboard
                    </motion.h3>
                    <motion.p
                      className="text-gray-600 dark:text-gray-300 text-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      {t("carousel.dashboard")}
                    </motion.p>
                  </div>
                </motion.div>
              </motion.div>
            </CarouselItem>

            {/* Transactions Screenshot */}
            <CarouselItem>
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 border hover-lift gpu-accelerated"
                whileHover={{ y: -5 }}
                transition={{
                  type: "spring",
                  damping: 20,
                  stiffness: 300,
                }}
              >
                <motion.div
                  className="flex items-center gap-2 mb-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.div
                    className="w-3 h-3 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div
                    className="w-3 h-3 bg-yellow-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: 0.3,
                    }}
                  />
                  <motion.div
                    className="w-3 h-3 bg-green-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: 0.6,
                    }}
                  />
                  <span className="ml-4 text-sm text-gray-500">
                    Ten10 Transactions
                  </span>
                </motion.div>
                <motion.div
                  className="bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900 rounded-lg p-8 text-center aspect-video flex items-center justify-center animate-gradient"
                  whileHover={{ scale: 1.05 }}
                  transition={{
                    type: "spring",
                    damping: 20,
                    stiffness: 300,
                  }}
                >
                  <div>
                    <motion.div
                      animate={{
                        y: [-5, 5, -5],
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <FileText className="h-16 w-16 mx-auto mb-4 text-green-600" />
                    </motion.div>
                    <motion.h3
                      className="text-2xl font-bold mb-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      Transactions
                    </motion.h3>
                    <motion.p
                      className="text-gray-600 dark:text-gray-300 text-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      {t("carousel.transactions")}
                    </motion.p>
                  </div>
                </motion.div>
              </motion.div>
            </CarouselItem>

            {/* Reports Screenshot */}
            <CarouselItem>
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 border hover-lift gpu-accelerated"
                whileHover={{ y: -5 }}
                transition={{
                  type: "spring",
                  damping: 20,
                  stiffness: 300,
                }}
              >
                <motion.div
                  className="flex items-center gap-2 mb-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.div
                    className="w-3 h-3 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div
                    className="w-3 h-3 bg-yellow-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: 0.3,
                    }}
                  />
                  <motion.div
                    className="w-3 h-3 bg-green-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: 0.6,
                    }}
                  />
                  <span className="ml-4 text-sm text-gray-500">
                    Ten10 Reports
                  </span>
                </motion.div>
                <motion.div
                  className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-lg p-8 text-center aspect-video flex items-center justify-center animate-gradient"
                  whileHover={{ scale: 1.05 }}
                  transition={{
                    type: "spring",
                    damping: 20,
                    stiffness: 300,
                  }}
                >
                  <div>
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        rotate: {
                          duration: 8,
                          repeat: Infinity,
                          ease: "linear",
                        },
                        scale: { duration: 2, repeat: Infinity },
                      }}
                    >
                      <PieChart className="h-16 w-16 mx-auto mb-4 text-purple-600" />
                    </motion.div>
                    <motion.h3
                      className="text-2xl font-bold mb-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      Reports
                    </motion.h3>
                    <motion.p
                      className="text-gray-600 dark:text-gray-300 text-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      {t("carousel.reports")}
                    </motion.p>
                  </div>
                </motion.div>
              </motion.div>
            </CarouselItem>
          </CarouselContent>

          <CarouselPrevious className="hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors duration-200" />
          <CarouselNext className="hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors duration-200" />
        </Carousel>
      </motion.div>

      {/* Enhanced Carousel Progress Bar */}
      <motion.div className="mt-6 max-w-xs mx-auto">
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          <Progress value={carouselProgress} className="h-2 animate-shimmer" />
        </motion.div>
        <motion.p
          className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {t("carousel.swipeHint", "החלק לצפייה בעוד צילומי מסך")}
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

