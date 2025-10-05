import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useCountUp } from "@/hooks/useCountUp";
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
    // Add Google Analytics script
    const gaScript = document.createElement("script");
    gaScript.async = true;
    gaScript.src =
      "https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID";
    document.head.appendChild(gaScript);

    // Add GA configuration
    const gaConfigScript = document.createElement("script");
    gaConfigScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'GA_MEASUREMENT_ID', {
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
        <nav className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full px-6 py-3 shadow-lg border transition-all duration-300">
          <div className="flex items-center gap-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeSection === item.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                aria-label={`Navigate to ${item.label}`}
              >
                {t(item.labelKey, item.label)}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Hero Section */}
      <section
        id="hero"
        ref={sectionRefs.hero}
        className="relative overflow-hidden py-20 px-4"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 opacity-50"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 dark:bg-blue-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30 animate-pulse"></div>
        <div
          className="absolute bottom-20 right-10 w-72 h-72 bg-purple-200 dark:bg-purple-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-30 animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16">
            {/* Logo */}
            <div className="mb-8 animate-fade-in">
              <LazyImage
                src="/icon-512.png"
                alt="Ten10 Logo"
                className="w-24 h-24 mx-auto rounded-2xl shadow-lg hover:scale-110 transition-transform duration-300"
                placeholder={
                  <div className="w-24 h-24 mx-auto bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center animate-pulse">
                    <Calculator className="h-12 w-12 text-blue-600" />
                  </div>
                }
              />
            </div>

            <Badge
              variant="secondary"
              className="mb-4 text-sm font-medium animate-fade-in"
            >
              {t("hero.badge")}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              <span className="text-blue-600">Ten10</span> -{" "}
              {t("hero.title").replace("Ten10 - ", "")}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
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
            </div>
          </div>

          {/* Screenshots Carousel */}
          <div className="relative mx-auto max-w-4xl">
            <Carousel
              className="w-full"
              opts={{ align: "start", loop: true }}
              setApi={setCarouselApi}
            >
              <CarouselContent>
                <CarouselItem>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 border">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="ml-4 text-sm text-gray-500">
                        Ten10 Dashboard
                      </span>
                    </div>
                    <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg p-8 text-center aspect-video flex items-center justify-center">
                      <div>
                        <Calculator className="h-16 w-16 mx-auto mb-4 text-blue-600" />
                        <h3 className="text-2xl font-bold mb-2">Dashboard</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          {t("carousel.dashboard")}
                        </p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>

                <CarouselItem>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 border">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="ml-4 text-sm text-gray-500">
                        Ten10 Transactions
                      </span>
                    </div>
                    <div className="bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900 rounded-lg p-8 text-center aspect-video flex items-center justify-center">
                      <div>
                        <FileText className="h-16 w-16 mx-auto mb-4 text-green-600" />
                        <h3 className="text-2xl font-bold mb-2">
                          Transactions
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          {t("carousel.transactions")}
                        </p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>

                <CarouselItem>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 border">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="ml-4 text-sm text-gray-500">
                        Ten10 Reports
                      </span>
                    </div>
                    <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-lg p-8 text-center aspect-video flex items-center justify-center">
                      <div>
                        <PieChart className="h-16 w-16 mx-auto mb-4 text-purple-600" />
                        <h3 className="text-2xl font-bold mb-2">Reports</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          {t("carousel.reports")}
                        </p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>

            {/* Carousel Progress Bar */}
            <div className="mt-6 max-w-xs mx-auto">
              <Progress value={carouselProgress} className="h-2" />
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                {t("carousel.swipeHint", "החלק לצפייה בעוד צילומי מסך")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div
                ref={usersCount.elementRef}
                className="text-4xl font-bold mb-2"
              >
                {usersCount.count.toLocaleString()}+
              </div>
              <p className="text-blue-100">{t("stats.users")}</p>
            </div>
            <div>
              <div
                ref={moneyCount.elementRef}
                className="text-4xl font-bold mb-2"
              >
                ₪{moneyCount.count}M+
              </div>
              <p className="text-blue-100">{t("stats.managed")}</p>
            </div>
            <div>
              <div
                ref={donatedCount.elementRef}
                className="text-4xl font-bold mb-2"
              >
                ₪{donatedCount.count}M+
              </div>
              <p className="text-blue-100">{t("stats.donated")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        ref={sectionRefs.features}
        className="py-20 px-4 bg-white dark:bg-gray-800"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t("features.title")}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {t("features.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="text-blue-600 mb-2 transition-transform hover:scale-110">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">
                    {t(feature.titleKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {t(feature.descriptionKey)}
                  </CardDescription>
                </CardContent>
              </Card>
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
                <Button className="w-full mt-6" variant="outline">
                  <Globe className="mr-2 h-4 w-4" />
                  {t("platforms.web.button")}
                </Button>
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
                <Button className="w-full mt-6">
                  <Download className="mr-2 h-4 w-4" />
                  {t("platforms.desktop.button")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        ref={sectionRefs.testimonials}
        className="py-20 px-4 bg-white dark:bg-gray-800"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t("testimonials.title")}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 italic">
                    "{t(testimonial.textKey)}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{t(testimonial.nameKey)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Torah Quotes Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-amber-50 to-orange-100 dark:from-amber-900 dark:to-orange-900">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-8">
            {t("quotes.title", "מהמקורות")}
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border-r-4 border-amber-500">
            <blockquote className="text-lg md:text-xl text-gray-700 dark:text-gray-300 italic mb-4">
              "
              {t("quotes.main", "עשר תעשר את כל תבואת זרעך היוצא השדה שנה שנה")}
              "
            </blockquote>
            <cite className="text-sm text-gray-500 dark:text-gray-400">
              {t("quotes.source", "דברים יד, כב")}
            </cite>
          </div>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border-r-4 border-blue-500">
              <p className="text-gray-700 dark:text-gray-300 italic mb-2">
                "{t("quotes.chazal1", "המעשר מביא ברכה לבית")}"
              </p>
              <cite className="text-xs text-gray-500 dark:text-gray-400">
                {t("quotes.chazalSource1", "תלמוד בבלי, תענית ט.")}
              </cite>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border-r-4 border-green-500">
              <p className="text-gray-700 dark:text-gray-300 italic mb-2">
                "{t("quotes.chazal2", "נסני נא בזאת - בדבר המעשרות")}"
              </p>
              <cite className="text-xs text-gray-500 dark:text-gray-400">
                {t("quotes.chazalSource2", "מלאכי ג, י")}
              </cite>
            </div>
          </div>
        </div>
      </section>

      {/* About & Endorsements Section */}
      <section
        id="about"
        ref={sectionRefs.about}
        className="py-20 px-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900"
      >
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t("about.title", "אודות Ten10")}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {t(
                "about.subtitle",
                "פותח בשיתוף עם מכון תורת האדם לאדם ובהסכמת רבנים מובילים"
              )}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
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
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
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
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        ref={sectionRefs.faq}
        className="py-20 px-4 bg-gray-50 dark:bg-gray-900"
      >
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t("faq.title")}
            </h2>
          </div>

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
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-xl mb-8 text-blue-100">{t("cta.subtitle")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              <Download className="mr-2 h-5 w-5" />
              {t("cta.desktopButton")}
            </Button>
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
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section
        id="download"
        ref={sectionRefs.download}
        className="py-20 px-4 bg-white dark:bg-gray-800"
      >
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">
            {t("download.title")}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
            {t("download.subtitle")}
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <Monitor className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h3 className="font-semibold mb-2">Windows</h3>
                <Button className="w-full" asChild>
                  <a href="/downloads/Ten10-Windows.msi" download>
                    <Download className="mr-2 h-4 w-4" />
                    {t("download.downloadButton")}
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <Monitor className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h3 className="font-semibold mb-2">macOS</h3>
                <Button className="w-full" asChild>
                  <a href="/downloads/Ten10-macOS.dmg" download>
                    <Download className="mr-2 h-4 w-4" />
                    {t("download.downloadButton")}
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <Monitor className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h3 className="font-semibold mb-2">Linux</h3>
                <Button className="w-full" asChild>
                  <a href="/downloads/Ten10-Linux.AppImage" download>
                    <Download className="mr-2 h-4 w-4" />
                    {t("download.downloadButton")}
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-2 border-green-500">
              <CardContent className="pt-6 text-center">
                <Globe className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="font-semibold mb-2">
                  {t("download.webCard.title", "אפליקציית ווב")}
                </h3>
                <Button className="w-full" asChild>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center"
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    {t("download.webCard.button", "פתח כעת")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

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
