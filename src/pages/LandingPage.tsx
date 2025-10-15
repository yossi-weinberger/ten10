import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";
import {
  useScrollAnimation,
  fadeInUp,
  scaleIn,
  staggerContainer,
  staggerItem,
  buttonTap,
  buttonHover,
} from "@/hooks/useScrollAnimation";
import { FadeInWords, RevealText } from "@/components/ui/animated-text";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { LazyImage } from "@/components/ui/lazy-image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Calculator,
  Download,
  Globe,
  Mail,
  Monitor,
  Star,
  CheckCircle,
  Calendar,
  PieChart,
  FileText,
  Users,
  Smartphone,
} from "lucide-react";

const LandingPage: React.FC = () => {
  const { t, i18n } = useTranslation("landing");
  const [activeSection, setActiveSection] = useState("hero");
  const [showNavigation, setShowNavigation] = useState(false);
  const [carouselProgress, setCarouselProgress] = useState(0);
  const [carouselApi, setCarouselApi] = useState<any>(null);

  // Scroll animations
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, -100]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.8]);

  // Animation refs
  const heroRef = useScrollAnimation({ threshold: 0.2 });
  const statsRef = useScrollAnimation({ threshold: 0.3 });
  const featuresRef = useScrollAnimation({ threshold: 0.1 });
  const testimonialsRef = useScrollAnimation({ threshold: 0.1 });
  const quotesRef = useScrollAnimation({ threshold: 0.1 });
  const aboutRef = useScrollAnimation({ threshold: 0.1 });
  const faqRef = useScrollAnimation({ threshold: 0.1 });
  const ctaRef = useScrollAnimation({ threshold: 0.1 });
  const downloadRef = useScrollAnimation({ threshold: 0.1 });

  // Animated counters for stats
  const usersCount = useCountUp({ end: 10000, duration: 2500, delay: 500 });
  const moneyCount = useCountUp({ end: 50, duration: 2500, delay: 700 }); // 50M
  const donatedCount = useCountUp({ end: 25, duration: 2500, delay: 900 }); // 25M donated

  // Section refs for intersection observer
  const sectionRefs = {
    hero: useRef<HTMLElement>(null),
    features: useRef<HTMLElement>(null),
    platforms: useRef<HTMLElement>(null),
    testimonials: useRef<HTMLElement>(null),
    about: useRef<HTMLElement>(null),
    faq: useRef<HTMLElement>(null),
    download: useRef<HTMLElement>(null),
  };

  // Smooth scrolling function
  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs[sectionId as keyof typeof sectionRefs]?.current;
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Intersection Observer for active section detection
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -80% 0px",
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    );

    Object.values(sectionRefs).forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    // Show navigation after scroll
    const handleScroll = () => {
      setShowNavigation(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
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
    updateProgress();

    return () => {
      carouselApi.off("scroll", updateProgress);
    };
  }, [carouselApi]);

  // SEO and Meta tags
  useEffect(() => {
    const currentLang = i18n.language;
    const isHebrew = currentLang === "he";

    // Update document title
    document.title = isHebrew
      ? "Ten10 - ניהול מעשרות חכם | אפליקציה לחישוב מעשר אוטומטי"
      : "Ten10 - Smart Tithe Management | Automatic Tithe Calculation App";

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        isHebrew
          ? "המערכת המתקדמת לניהול מעשרות. חישובים אוטומטיים, תזכורות חכמות, גרסת ווב ודסקטופ. מאושר הלכתית."
          : "Advanced tithe management system. Automatic calculations, smart reminders, web and desktop versions. Halachically approved."
      );
    }

    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute(
        "content",
        isHebrew
          ? "מעשר, מעשרות, צדקה, תרומות, הלכה, יהדות, חישוב מעשר, ניהול כספים יהודי"
          : "tithe, tithes, charity, donations, halacha, judaism, tithe calculation, jewish finance management"
      );
    }

    // Add Schema.org structured data
    const existingSchema = document.querySelector(
      'script[type="application/ld+json"]'
    );
    if (existingSchema) {
      existingSchema.remove();
    }

    const schemaData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Ten10",
      description: isHebrew
        ? "מערכת מתקדמת לניהול מעשרות עם חישובים אוטומטיים ותזכורות חכמות"
        : "Advanced tithe management system with automatic calculations and smart reminders",
      applicationCategory: "FinanceApplication",
      operatingSystem: ["Windows", "macOS", "Linux", "Web Browser"],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      author: {
        "@type": "Organization",
        name: "Ten10 Development Team",
      },
      inLanguage: [currentLang],
      isAccessibleForFree: true,
      screenshot: "https://ten10-app.com/screenshots/dashboard.png",
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schemaData);
    document.head.appendChild(script);

    return () => {
      const schemaScript = document.querySelector(
        'script[type="application/ld+json"]'
      );
      if (schemaScript) {
        schemaScript.remove();
      }
    };
  }, [i18n.language, t]);

  // Google Analytics
  useEffect(() => {
    const gaId = import.meta.env.VITE_G_ANALYTICS_ID;

    // Only load GA if we have an ID
    if (!gaId) {
      console.log("Google Analytics ID not found in environment variables");
      return;
    }

    console.log("Loading Google Analytics with ID:", gaId);

    // Add Google Analytics script
    const gaScript = document.createElement("script");
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(gaScript);

    // Add GA configuration
    const gaConfigScript = document.createElement("script");
    gaConfigScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', {
        page_title: 'Ten10 Landing Page',
        page_location: window.location.href,
        language: '${i18n.language}'
      });
    `;
    document.head.appendChild(gaConfigScript);

    // Track page view
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "page_view", {
        page_title: "Ten10 Landing Page",
        page_location: window.location.href,
        language: i18n.language,
      });
    }

    return () => {
      // Cleanup scripts
      const scripts = document.querySelectorAll(
        'script[src*="googletagmanager"]'
      );
      scripts.forEach((script) => script.remove());
    };
  }, [i18n.language]);

  // Analytics tracking functions
  const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", eventName, {
        language: i18n.language,
        ...parameters,
      });
    }
  };

  const trackDownloadClick = (platform: string) => {
    trackEvent("download_click", {
      platform,
      section: "hero",
    });
  };

  const trackWebAppClick = () => {
    trackEvent("web_app_click", {
      section: "hero",
    });
  };

  // Navigation items
  const navigationItems = [
    { id: "hero", labelKey: "nav.home", label: "בית" },
    { id: "features", labelKey: "nav.features", label: "תכונות" },
    { id: "platforms", labelKey: "nav.platforms", label: "גרסאות" },
    { id: "testimonials", labelKey: "nav.testimonials", label: "המלצות" },
    { id: "about", labelKey: "nav.about", label: "אודות" },
    { id: "faq", labelKey: "nav.faq", label: "שאלות" },
    { id: "download", labelKey: "nav.download", label: "הורדה" },
  ];

  const features = [
    {
      icon: <Calculator className="h-8 w-8" />,
      titleKey: "features.items.autoCalculation.title",
      descriptionKey: "features.items.autoCalculation.description",
    },
    {
      icon: <Globe className="h-8 w-8" />,
      titleKey: "features.items.accessAnywhere.title",
      descriptionKey: "features.items.accessAnywhere.description",
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      titleKey: "features.items.smartRecurring.title",
      descriptionKey: "features.items.smartRecurring.description",
    },
    {
      icon: <Mail className="h-8 w-8" />,
      titleKey: "features.items.personalReminders.title",
      descriptionKey: "features.items.personalReminders.description",
    },
    {
      icon: <PieChart className="h-8 w-8" />,
      titleKey: "features.items.reportsCharts.title",
      descriptionKey: "features.items.reportsCharts.description",
    },
    {
      icon: <FileText className="h-8 w-8" />,
      titleKey: "features.items.dataExport.title",
      descriptionKey: "features.items.dataExport.description",
    },
    {
      icon: <Smartphone className="h-8 w-8" />,
      titleKey: "features.items.pwaInstall.title",
      descriptionKey: "features.items.pwaInstall.description",
    },
    {
      icon: <Star className="h-8 w-8" />,
      titleKey: "features.items.chomesh.title",
      descriptionKey: "features.items.chomesh.description",
    },
  ];

  const testimonials = [
    {
      nameKey: "testimonials.items.0.name",
      textKey: "testimonials.items.0.text",
      rating: 5,
    },
    {
      nameKey: "testimonials.items.1.name",
      textKey: "testimonials.items.1.text",
      rating: 5,
    },
    {
      nameKey: "testimonials.items.2.name",
      textKey: "testimonials.items.2.text",
      rating: 5,
    },
  ];

  const faqs = [
    {
      questionKey: "faq.items.0.question",
      answerKey: "faq.items.0.answer",
    },
    {
      questionKey: "faq.items.1.question",
      answerKey: "faq.items.1.answer",
    },
    {
      questionKey: "faq.items.2.question",
      answerKey: "faq.items.2.answer",
    },
    {
      questionKey: "faq.items.3.question",
      answerKey: "faq.items.3.answer",
    },
  ];

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800"
      dir={i18n.dir()}
    >
      {/* Language Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageToggle
          variant="ghost"
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
        />
      </div>

      {/* Floating Navigation */}
      {showNavigation && (
        <motion.nav
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 glass-morphism dark:glass-morphism-dark rounded-full px-6 py-3 shadow-lg border"
        >
          <div className="flex items-center gap-1">
            {navigationItems.map((item, index) => (
              <motion.button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                whileHover={buttonHover}
                whileTap={buttonTap}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeSection === item.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                aria-label={`Navigate to ${item.label}`}
              >
                {t(item.labelKey, item.label)}
              </motion.button>
            ))}
          </div>
        </motion.nav>
      )}

      {/* Hero Section */}
      <motion.section
        id="hero"
        ref={sectionRefs.hero}
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative overflow-hidden py-20 px-4 parallax-container"
      >
        {/* Enhanced Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 opacity-50 animate-gradient"></div>

        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-blue-200 dark:bg-blue-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute bottom-20 right-10 w-72 h-72 bg-purple-200 dark:bg-purple-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
            opacity: [0.6, 0.3, 0.6],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />

        {/* Additional floating elements */}
        <motion.div
          className="absolute top-1/2 left-1/4 w-32 h-32 bg-green-200 dark:bg-green-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-2xl opacity-20"
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            scale: [0.8, 1.1, 0.8],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="container mx-auto max-w-6xl relative z-10"
          ref={heroRef.ref}
          initial="hidden"
          animate={heroRef.isInView ? "visible" : "hidden"}
          variants={staggerContainer}
        >
          <div className="text-center mb-16">
            {/* Logo */}
            <motion.div className="mb-8" variants={scaleIn}>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block"
              >
                <LazyImage
                  src="/icon-512.png"
                  alt="Ten10 Logo"
                  className="w-24 h-24 mx-auto rounded-2xl shadow-lg gpu-accelerated animate-pulse-glow"
                  placeholder={
                    <div className="w-24 h-24 mx-auto bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center animate-pulse">
                      <Calculator className="h-12 w-12 text-blue-600" />
                    </div>
                  }
                />
              </motion.div>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Badge
                variant="secondary"
                className="mb-4 text-sm font-medium animate-shimmer"
              >
                {t("hero.badge")}
              </Badge>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6"
              variants={fadeInUp}
            >
              <motion.span
                className="gradient-text"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                Ten10
              </motion.span>{" "}
              -{" "}
              <FadeInWords delay={0.5}>
                {t("hero.title").replace("Ten10 - ", "")}
              </FadeInWords>
            </motion.h1>

            <motion.div variants={fadeInUp}>
              <RevealText
                className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto"
                delay={0.8}
              >
                {t("hero.subtitle")}
              </RevealText>
            </motion.div>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              variants={staggerContainer}
            >
              <motion.div variants={staggerItem}>
                <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                  <Button
                    size="lg"
                    className="text-lg px-8 py-3"
                    onClick={() => {
                      trackDownloadClick("hero");
                      scrollToSection("download");
                    }}
                  >
                    <Download className="mr-2 h-5 w-5" />
                    {t("hero.downloadButton")}
                  </Button>
                </motion.div>
              </motion.div>

              <motion.div variants={staggerItem}>
                <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="text-lg px-8 py-3"
                    onClick={() => trackWebAppClick()}
                    asChild
                  >
                    <Link
                      to="/"
                      className="inline-flex items-center"
                      aria-label={t("hero.tryButton")}
                    >
                      <Globe className="mr-2 h-5 w-5" />
                      {t("hero.tryButton")}
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>

          {/* Screenshots Carousel */}
          <motion.div
            className="relative mx-auto max-w-4xl"
            variants={fadeInUp}
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
            <motion.div className="mt-6 max-w-xs mx-auto" variants={fadeInUp}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
              >
                <Progress
                  value={carouselProgress}
                  className="h-2 animate-shimmer"
                />
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
        </motion.div>
      </motion.section>

      {/* Stats Section */}
      <motion.section
        className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-700 text-white relative overflow-hidden"
        ref={statsRef.ref}
        initial="hidden"
        animate={statsRef.isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        {/* Animated background elements */}
        <motion.div
          className="absolute top-0 left-0 w-full h-full opacity-10"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        <div className="container mx-auto max-w-4xl relative z-10">
          <motion.div
            className="grid md:grid-cols-3 gap-8 text-center"
            variants={staggerContainer}
          >
            <motion.div variants={staggerItem}>
              <motion.div
                ref={usersCount.elementRef}
                className="text-4xl font-bold mb-2"
                whileHover={{ scale: 1.1 }}
                animate={{
                  textShadow: [
                    "0 0 10px rgba(255,255,255,0.5)",
                    "0 0 20px rgba(255,255,255,0.8)",
                    "0 0 10px rgba(255,255,255,0.5)",
                  ],
                }}
                transition={{
                  textShadow: { duration: 2, repeat: Infinity },
                  scale: { type: "spring", damping: 20, stiffness: 300 },
                }}
              >
                {usersCount.count.toLocaleString()}+
              </motion.div>
              <motion.p className="text-blue-100" variants={fadeInUp}>
                {t("stats.users")}
              </motion.p>
            </motion.div>

            <motion.div variants={staggerItem}>
              <motion.div
                ref={moneyCount.elementRef}
                className="text-4xl font-bold mb-2"
                whileHover={{ scale: 1.1 }}
                animate={{
                  textShadow: [
                    "0 0 10px rgba(255,255,255,0.5)",
                    "0 0 20px rgba(255,255,255,0.8)",
                    "0 0 10px rgba(255,255,255,0.5)",
                  ],
                }}
                transition={{
                  textShadow: { duration: 2, repeat: Infinity, delay: 0.5 },
                  scale: { type: "spring", damping: 20, stiffness: 300 },
                }}
              >
                ₪{moneyCount.count}M+
              </motion.div>
              <motion.p className="text-blue-100" variants={fadeInUp}>
                {t("stats.managed")}
              </motion.p>
            </motion.div>

            <motion.div variants={staggerItem}>
              <motion.div
                ref={donatedCount.elementRef}
                className="text-4xl font-bold mb-2"
                whileHover={{ scale: 1.1 }}
                animate={{
                  textShadow: [
                    "0 0 10px rgba(255,255,255,0.5)",
                    "0 0 20px rgba(255,255,255,0.8)",
                    "0 0 10px rgba(255,255,255,0.5)",
                  ],
                }}
                transition={{
                  textShadow: { duration: 2, repeat: Infinity, delay: 1 },
                  scale: { type: "spring", damping: 20, stiffness: 300 },
                }}
              >
                ₪{donatedCount.count}M+
              </motion.div>
              <motion.p className="text-blue-100" variants={fadeInUp}>
                {t("stats.donated")}
              </motion.p>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section
        id="features"
        ref={sectionRefs.features}
        className="py-20 px-4 bg-white dark:bg-gray-800 relative overflow-hidden"
      >
        {/* Background decoration */}
        <motion.div
          className="absolute top-10 right-10 w-80 h-80 bg-blue-200 dark:bg-blue-800 rounded-full opacity-40 filter blur-2xl"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Additional background decoration */}
        <motion.div
          className="absolute bottom-10 left-10 w-60 h-60 bg-purple-200 dark:bg-purple-800 rounded-full opacity-30 filter blur-2xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
        />

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16" ref={featuresRef.ref}>
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
              initial={{ opacity: 0, y: 30 }}
              animate={
                featuresRef.isInView
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 30 }
              }
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              {t("features.title")}
            </motion.h2>
            <motion.p
              className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={
                featuresRef.isInView
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 30 }
              }
              transition={{
                delay: 0.1,
                type: "spring",
                damping: 20,
                stiffness: 300,
              }}
            >
              {t("features.subtitle")}
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={
                  featuresRef.isInView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 50 }
                }
                transition={{
                  delay: index * 0.1,
                  type: "spring",
                  damping: 20,
                  stiffness: 300,
                }}
                whileHover={{ y: -8 }}
                whileTap={{ scale: 0.98 }}
                className="group"
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:from-blue-50 hover:to-purple-50 dark:hover:from-gray-700 dark:hover:to-gray-800">
                  <CardHeader>
                    <motion.div
                      className="text-blue-600 mb-2"
                      whileHover={{
                        scale: 1.2,
                        rotate: 10,
                        color: "#8B5CF6",
                      }}
                      transition={{
                        type: "spring",
                        damping: 20,
                        stiffness: 300,
                      }}
                    >
                      {feature.icon}
                    </motion.div>
                    <CardTitle className="text-xl group-hover:text-blue-600 transition-colors duration-300">
                      {t(feature.titleKey)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                      {t(feature.descriptionKey)}
                    </CardDescription>
                  </CardContent>

                  {/* Hover effect overlay */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    initial={{ scale: 0.8 }}
                    whileHover={{ scale: 1 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  />
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Comparison */}
      <section
        id="platforms"
        ref={sectionRefs.platforms}
        className="py-20 px-4 bg-gray-50 dark:bg-gray-900"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t("platforms.title")}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Web Version */}
            <Card className="relative overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <div className="flex items-center gap-2">
                  <Globe className="h-6 w-6" />
                  <CardTitle className="text-2xl">
                    {t("platforms.web.title")}
                  </CardTitle>
                </div>
                <CardDescription className="text-blue-100">
                  {t("platforms.web.subtitle")} •{" "}
                  {t("platforms.web.pwaNote", "ניתן להתקין כאפליקציה")}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {t("platforms.web.features", { returnObjects: true }).map(
                    (item: string, index: number) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>{item}</span>
                      </li>
                    )
                  )}
                </ul>
                <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                  <Button className="w-full mt-6" variant="outline">
                    <Globe className="mr-2 h-4 w-4" />
                    {t("platforms.web.button")}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>

            {/* Desktop Version */}
            <Card className="relative overflow-hidden border-2 border-blue-500">
              <div className="absolute top-4 right-4">
                <Badge className="bg-blue-500">
                  {t("platforms.desktop.badge")}
                </Badge>
              </div>
              <CardHeader className="bg-gradient-to-r from-green-500 to-blue-600 text-white">
                <div className="flex items-center gap-2">
                  <Monitor className="h-6 w-6" />
                  <CardTitle className="text-2xl">
                    {t("platforms.desktop.title")}
                  </CardTitle>
                </div>
                <CardDescription className="text-green-100">
                  {t("platforms.desktop.subtitle")}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {t("platforms.desktop.features", { returnObjects: true }).map(
                    (item: string, index: number) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>{item}</span>
                      </li>
                    )
                  )}
                </ul>
                <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                  <Button className="w-full mt-6">
                    <Download className="mr-2 h-4 w-4" />
                    {t("platforms.desktop.button")}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <motion.section
        id="testimonials"
        ref={sectionRefs.testimonials}
        className="py-20 px-4 bg-white dark:bg-gray-800"
        initial="hidden"
        animate={testimonialsRef.isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        <div className="container mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-16"
            ref={testimonialsRef.ref}
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t("testimonials.title")}
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.1,
                  type: "spring",
                  damping: 20,
                  stiffness: 300,
                }}
                whileHover={{ y: -8 }}
                viewport={{ once: true }}
              >
                <Card className="hover:shadow-xl transition-all duration-300 hover:border-blue-200 dark:hover:border-blue-800 group">
                  <CardContent className="pt-6">
                    <motion.div
                      className="flex mb-4"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, rotate: -180 }}
                          whileInView={{ opacity: 1, rotate: 0 }}
                          transition={{ delay: index * 0.1 + i * 0.1 }}
                          whileHover={{ scale: 1.2, rotate: 10 }}
                        >
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        </motion.div>
                      ))}
                    </motion.div>
                    <motion.p
                      className="text-gray-600 dark:text-gray-300 mb-4 italic group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      "{t(testimonial.textKey)}"
                    </motion.p>
                    <motion.div
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                    >
                      <motion.div
                        className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors duration-300"
                        whileHover={{ scale: 1.1, rotate: 360 }}
                        transition={{
                          type: "spring",
                          damping: 20,
                          stiffness: 300,
                        }}
                      >
                        <Users className="h-5 w-5 text-blue-600" />
                      </motion.div>
                      <div>
                        <p className="font-semibold group-hover:text-blue-600 transition-colors duration-300">
                          {t(testimonial.nameKey)}
                        </p>
                      </div>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Torah Quotes Section */}
      <motion.section
        className="py-16 px-4 bg-gradient-to-r from-amber-50 to-orange-100 dark:from-amber-900 dark:to-orange-900"
        ref={quotesRef.ref}
        initial="hidden"
        animate={quotesRef.isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        <div className="container mx-auto max-w-4xl text-center">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-8"
            variants={fadeInUp}
          >
            {t("quotes.title", "מהמקורות")}
          </motion.h2>
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border-r-4 border-amber-500"
            variants={scaleIn}
          >
            <blockquote className="text-lg md:text-xl text-gray-700 dark:text-gray-300 italic mb-4">
              "
              {t("quotes.main", "עשר תעשר את כל תבואת זרעך היוצא השדה שנה שנה")}
              "
            </blockquote>
            <cite className="text-sm text-gray-500 dark:text-gray-400">
              {t("quotes.source", "דברים יד, כב")}
            </cite>
          </motion.div>
          <motion.div
            className="mt-6 grid md:grid-cols-2 gap-6"
            variants={staggerContainer}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border-r-4 border-blue-500"
              variants={staggerItem}
            >
              <p className="text-gray-700 dark:text-gray-300 italic mb-2">
                "{t("quotes.chazal1", "המעשר מביא ברכה לבית")}"
              </p>
              <cite className="text-xs text-gray-500 dark:text-gray-400">
                {t("quotes.chazalSource1", "תלמוד בבלי, תענית ט.")}
              </cite>
            </motion.div>
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border-r-4 border-green-500"
              variants={staggerItem}
            >
              <p className="text-gray-700 dark:text-gray-300 italic mb-2">
                "{t("quotes.chazal2", "נסני נא בזאת - בדבר המעשרות")}"
              </p>
              <cite className="text-xs text-gray-500 dark:text-gray-400">
                {t("quotes.chazalSource2", "מלאכי ג, י")}
              </cite>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* About & Endorsements Section */}
      <motion.section
        id="about"
        ref={sectionRefs.about}
        className="py-20 px-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900"
        initial="hidden"
        animate={aboutRef.isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        <div className="container mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-16"
            ref={aboutRef.ref}
            variants={staggerContainer}
          >
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
              variants={fadeInUp}
            >
              {t("about.title", "אודות Ten10")}
            </motion.h2>
            <motion.p
              className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
              variants={fadeInUp}
            >
              {t(
                "about.subtitle",
                "פותח בשיתוף עם מכון תורת האדם לאדם ובהסכמת רבנים מובילים"
              )}
            </motion.p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 gap-12 items-center mb-16"
            variants={staggerContainer}
          >
            <motion.div variants={staggerItem}>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t("about.partnership.title", "שיתוף עם מכון תורת האדם לאדם")}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                {t(
                  "about.partnership.description",
                  "Ten10 פותח בשיתוף עם מכון תורת האדם לאדם, המוביל בתחום ההלכה הפרקטית. המכון ליווה את הפיתוח ואישר את דיוק החישובים ההלכתיים."
                )}
              </p>
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {t("about.partnership.verified", "מאושר הלכתית")}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t("about.partnership.institute", "מכון תורת האדם לאדם")}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg"
              variants={staggerItem}
            >
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                {t("about.endorsements.title", "הסכמות רבנים")}
              </h4>
              <div className="space-y-6">
                <div className="border-r-4 border-blue-500 pr-4">
                  <p className="text-gray-600 dark:text-gray-300 italic mb-2">
                    "
                    {t(
                      "about.endorsements.quote1",
                      "מערכת מצוינת לניהול מעשרות בדיוק ובקלות. מומלץ בחום."
                    )}
                    "
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t("about.endorsements.rabbi1", "הרב [שם הרב]")}
                  </p>
                </div>

                <div className="border-r-4 border-green-500 pr-4">
                  <p className="text-gray-600 dark:text-gray-300 italic mb-2">
                    "
                    {t(
                      "about.endorsements.quote2",
                      "כלי חשוב ומועיל לכל בית יהודי. החישובים מדויקים והממשק נוח."
                    )}
                    "
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t("about.endorsements.rabbi2", "הרב [שם הרב]")}
                  </p>
                </div>

                <div className="border-r-4 border-purple-500 pr-4">
                  <p className="text-gray-600 dark:text-gray-300 italic mb-2">
                    "
                    {t(
                      "about.endorsements.quote3",
                      "פתרון מקצועי ואמין לניהול מעשרות. ממליץ לכל המתלמידים שלי."
                    )}
                    "
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t("about.endorsements.rabbi3", "הרב [שם הרב]")}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* FAQ Section */}
      <motion.section
        id="faq"
        ref={sectionRefs.faq}
        className="py-20 px-4 bg-gray-50 dark:bg-gray-900"
        initial="hidden"
        animate={faqRef.isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="text-center mb-16"
            ref={faqRef.ref}
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t("faq.title")}
            </h2>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-lg font-semibold text-right">
                    {t(faq.questionKey)}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-600 dark:text-gray-300 text-right">
                      {t(faq.answerKey)}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </motion.section>

      {/* Final CTA */}
      <motion.section
        className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-700 text-white"
        ref={ctaRef.ref}
        initial="hidden"
        animate={ctaRef.isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        <div className="container mx-auto max-w-4xl text-center">
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-4"
            variants={fadeInUp}
          >
            {t("cta.title")}
          </motion.h2>
          <motion.p className="text-xl mb-8 text-blue-100" variants={fadeInUp}>
            {t("cta.subtitle")}
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={staggerItem}>
              <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-lg px-8 py-3"
                >
                  <Download className="mr-2 h-5 w-5" />
                  {t("cta.desktopButton")}
                </Button>
              </motion.div>
            </motion.div>

            <motion.div variants={staggerItem}>
              <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-lg px-8 py-3"
                  asChild
                >
                  <Link to="/" className="inline-flex items-center">
                    <Globe className="mr-2 h-5 w-5" />
                    {t("cta.webButton")}
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Download Section */}
      <motion.section
        id="download"
        ref={sectionRefs.download}
        className="py-20 px-4 bg-white dark:bg-gray-800"
        initial="hidden"
        animate={downloadRef.isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div ref={downloadRef.ref}>
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8"
              variants={fadeInUp}
            >
              {t("download.title")}
            </motion.h2>
            <motion.p
              className="text-xl text-gray-600 dark:text-gray-300 mb-12"
              variants={fadeInUp}
            >
              {t("download.subtitle")}
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -8 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              <Card className="hover:shadow-xl transition-all duration-300 group hover:border-blue-200 dark:hover:border-blue-800">
                <CardContent className="pt-6 text-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <Monitor className="h-12 w-12 mx-auto mb-4 text-blue-600 group-hover:text-blue-700 transition-colors duration-300" />
                  </motion.div>
                  <h3 className="font-semibold mb-2 group-hover:text-blue-600 transition-colors duration-300">
                    Windows
                  </h3>
                  <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                    <Button className="w-full" asChild>
                      <a href="/downloads/Ten10-Windows.msi" download>
                        <Download className="mr-2 h-4 w-4" />
                        {t("download.downloadButton")}
                      </a>
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              variants={staggerItem}
              whileHover={{ y: -8 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              <Card className="hover:shadow-xl transition-all duration-300 group hover:border-blue-200 dark:hover:border-blue-800">
                <CardContent className="pt-6 text-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, -5, 5, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.5,
                    }}
                  >
                    <Monitor className="h-12 w-12 mx-auto mb-4 text-blue-600 group-hover:text-blue-700 transition-colors duration-300" />
                  </motion.div>
                  <h3 className="font-semibold mb-2 group-hover:text-blue-600 transition-colors duration-300">
                    macOS
                  </h3>
                  <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                    <Button className="w-full" asChild>
                      <a href="/downloads/Ten10-macOS.dmg" download>
                        <Download className="mr-2 h-4 w-4" />
                        {t("download.downloadButton")}
                      </a>
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              variants={staggerItem}
              whileHover={{ y: -8 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              <Card className="hover:shadow-xl transition-all duration-300 group hover:border-blue-200 dark:hover:border-blue-800">
                <CardContent className="pt-6 text-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1,
                    }}
                  >
                    <Monitor className="h-12 w-12 mx-auto mb-4 text-blue-600 group-hover:text-blue-700 transition-colors duration-300" />
                  </motion.div>
                  <h3 className="font-semibold mb-2 group-hover:text-blue-600 transition-colors duration-300">
                    Linux
                  </h3>
                  <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                    <Button className="w-full" asChild>
                      <a href="/downloads/Ten10-Linux.AppImage" download>
                        <Download className="mr-2 h-4 w-4" />
                        {t("download.downloadButton")}
                      </a>
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: 3 * 0.1,
                type: "spring",
                damping: 20,
                stiffness: 300,
              }}
              whileHover={{ y: -8 }}
              viewport={{ once: true }}
            >
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-green-500 group hover:border-green-400 animate-pulse-glow">
                <CardContent className="pt-6 text-center">
                  <motion.div
                    animate={{
                      rotate: [0, 360],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                      scale: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                    }}
                  >
                    <Globe className="h-12 w-12 mx-auto mb-4 text-green-600 group-hover:text-green-700 transition-colors duration-300" />
                  </motion.div>
                  <h3 className="font-semibold mb-2 group-hover:text-green-600 transition-colors duration-300">
                    {t("download.webCard.title", "אפליקציית ווב")}
                  </h3>
                  <motion.div whileHover={buttonHover} whileTap={buttonTap}>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      asChild
                    >
                      <Link
                        to="/"
                        className="inline-flex items-center justify-center"
                      >
                        <Globe className="mr-2 h-4 w-4" />
                        {t("download.webCard.button", "פתח כעת")}
                      </Link>
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <LazyImage
                  src="/icon-192.png"
                  alt="Ten10 Logo"
                  className="w-8 h-8 rounded-lg"
                  placeholder={
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Calculator className="h-4 w-4 text-white" />
                    </div>
                  }
                />
                <h3 className="text-xl font-bold text-blue-400">Ten10</h3>
              </div>
              <p className="text-gray-300">{t("footer.description")}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("footer.product")}</h4>
              <ul className="space-y-2 text-gray-300">
                <li>{t("footer.links.features")}</li>
                <li>{t("footer.links.download")}</li>
                <li>{t("footer.links.support")}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("footer.company")}</h4>
              <ul className="space-y-2 text-gray-300">
                <li>{t("footer.links.about")}</li>
                <li>{t("footer.links.contact")}</li>
                <li>{t("footer.links.privacy")}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("footer.resources")}</h4>
              <ul className="space-y-2 text-gray-300">
                <li>{t("footer.links.halacha")}</li>
                <li>{t("footer.links.guides")}</li>
                <li>{t("footer.links.faq")}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Ten10. {t("footer.copyright")}.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
