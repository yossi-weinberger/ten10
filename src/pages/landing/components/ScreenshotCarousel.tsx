import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { ZoomIn, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScreenshotItem = {
  key: string;
  titleKey: string;
  src: string;
  alt: string;
};

type LightboxImage = {
  src: string;
  alt: string;
};

// Screenshots data - can be moved to a separate file if needed
const SCREENSHOTS: ScreenshotItem[] = [
  {
    key: "dashboard",
    titleKey: "carousel.items.dashboard",
    src: "/screenshots/dashboard.webp",
    alt: "Ten10 Dashboard",
  },
  {
    key: "add-transaction",
    titleKey: "carousel.items.addTransaction",
    src: "/screenshots/add-transaction.webp",
    alt: "Add Transaction Screen",
  },
  {
    key: "transactions-list",
    titleKey: "carousel.items.transactionsList",
    src: "/screenshots/transactions-list.webp",
    alt: "Transactions List",
  },
  {
    key: "print-report",
    titleKey: "carousel.items.printReport",
    src: "/screenshots/print-report.webp",
    alt: "Printable Report",
  },
  {
    key: "halacha",
    titleKey: "carousel.items.halacha",
    src: "/screenshots/halacha.webp",
    alt: "Halacha Library",
  },
];

// Shared button classes for carousel navigation
const CAROUSEL_BUTTON_CLASSES =
  "h-12 w-12 border-none bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-lg hover:bg-white dark:hover:bg-gray-800";

// Lightbox sizing constants
const LIGHTBOX_CONTAINER_SIZE = "95vw";
const LIGHTBOX_CONTAINER_HEIGHT = "95vh";
const LIGHTBOX_IMAGE_SIZE = "90vw";
const LIGHTBOX_IMAGE_HEIGHT = "90vh";

// Delay for checking cached image load state (ms)
const CACHED_IMAGE_CHECK_DELAY = 100;

const ScreenshotImage: React.FC<{
  src: string;
  alt: string;
}> = ({ src, alt }) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Handle cached/instant loads reliably
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const checkLoaded = () => {
      if (img.complete && img.naturalWidth > 0) {
        setIsLoaded(true);
        setHasError(false);
      }
    };

    checkLoaded();
    // Delay check to catch images that load between initial check and timeout
    const timeoutId = setTimeout(checkLoaded, CACHED_IMAGE_CHECK_DELAY);
    return () => clearTimeout(timeoutId);
  }, [src]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(false);
  }, []);

  const placeholderClasses =
    "absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center z-10";

  return (
    <>
      {!isLoaded && !hasError && (
        <div className={placeholderClasses} aria-hidden="true">
          <span className="text-gray-400 dark:text-gray-600 font-medium text-sm">
            {alt}
          </span>
        </div>
      )}

      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="relative w-full h-full object-contain transition-opacity duration-500"
        style={{ opacity: isLoaded ? 1 : 0 }}
        onError={handleError}
        onLoad={handleLoad}
        loading="eager"
      />

      {hasError && (
        <div className={placeholderClasses}>
          <span className="text-gray-400 dark:text-gray-600 font-medium text-sm">
            Image not found: {alt}
          </span>
        </div>
      )}
    </>
  );
};

export const ScreenshotCarousel: React.FC = () => {
  const { t, i18n } = useTranslation("landing");
  const [carouselProgress, setCarouselProgress] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(
    null
  );

  // Handle opening lightbox
  const openLightbox = useCallback((item: ScreenshotItem) => {
    setLightboxImage({ src: item.src, alt: item.alt });
    setLightboxOpen(true);
  }, []);

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
    carouselApi.on("select", updateProgress);
    updateProgress();

    return () => {
      carouselApi.off("scroll", updateProgress);
      carouselApi.off("select", updateProgress);
    };
  }, [carouselApi]);

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="text-center mb-6">
        <motion.span
          className="text-blue-600 dark:text-blue-400 font-semibold tracking-wider uppercase text-sm mb-2 block"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {t("carousel.eyebrow")}
        </motion.span>
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-neutral-800 dark:text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {t("carousel.title")}
        </motion.h2>
      </div>

      <motion.div
        className="relative mx-auto max-w-7xl px-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.2 }}
      >
        <Carousel
          className="w-full"
          opts={{
            align: "center",
            loop: true,
            // Force LTR for carousel mechanics - works better with Embla
            direction: "ltr",
          }}
          setApi={setCarouselApi}
        >
          {/* Keep Embla mechanics LTR even when page is RTL */}
          <CarouselContent style={{ direction: "ltr" }}>
            {SCREENSHOTS.map((item) => (
              <CarouselItem key={item.key}>
                <div className="flex flex-col gap-4 p-2" dir={i18n.dir()}>
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
                    {/* Description text comes from the translation key used for the title. */}
                  </div>

                  {/* Image Container */}
                  <motion.div
                    className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-800 aspect-[16/10] group cursor-pointer"
                    style={{
                      boxShadow:
                        "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    }}
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    onClick={() => openLightbox(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openLightbox(item);
                      }
                    }}
                    aria-label={`${t(item.titleKey)} - Click to enlarge`}
                  >
                    <ScreenshotImage src={item.src} alt={item.alt} />

                    {/* Zoom icon overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center pointer-events-none rounded-xl">
                      <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                  </motion.div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious
            className={`-left-6 md:-left-16 lg:-left-20 ${CAROUSEL_BUTTON_CLASSES}`}
            aria-label="Previous screenshot"
          />
          <CarouselNext
            className={`-right-6 md:-right-16 lg:-right-20 ${CAROUSEL_BUTTON_CLASSES}`}
            aria-label="Next screenshot"
          />
        </Carousel>

        {/* Progress Bar */}
        <motion.div className="mt-6 max-w-xs mx-auto">
          <Progress value={carouselProgress} className="h-1.5" />
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
            {t("carousel.swipeHint")}
          </p>
        </motion.div>
      </motion.div>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="p-2 dark:bg-black/95 bg-white/95 border-none grid place-items-center [&>button:not([data-custom-close])]:hidden"
          style={{
            maxWidth: LIGHTBOX_CONTAINER_SIZE,
            maxHeight: LIGHTBOX_CONTAINER_HEIGHT,
            width: LIGHTBOX_CONTAINER_SIZE,
            height: LIGHTBOX_CONTAINER_HEIGHT,
          }}
          dir={i18n.dir()}
        >
          {lightboxImage && (
            <>
              <DialogTitle className="sr-only">{lightboxImage.alt}</DialogTitle>
              <DialogDescription className="sr-only">
                {t("carousel.lightboxDescription")}
              </DialogDescription>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  data-custom-close
                  className="absolute right-4 top-4 z-50 h-10 w-10 rounded-full bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white shadow-lg hover:bg-white dark:hover:bg-gray-800 hover:scale-110 transition-all"
                  aria-label={t("carousel.closeLightbox")}
                >
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <img
                  src={lightboxImage.src}
                  alt={lightboxImage.alt}
                  className="w-auto h-auto object-contain rounded-lg"
                  style={{
                    maxWidth: LIGHTBOX_IMAGE_SIZE,
                    maxHeight: LIGHTBOX_IMAGE_HEIGHT,
                    boxShadow:
                      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  }}
                  loading="eager"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
