import { useTranslation } from "react-i18next";
import { useEffect, useState, useRef } from "react";
import { logger } from "@/lib/logger";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { LanguageToggleFixed } from "./components/LanguageToggleFixed";
import { FloatingNavigation } from "./components/FloatingNavigation";
import { HeroSection } from "./sections/HeroSection";
import { StatsSection } from "./sections/StatsSection";
import { FeaturesSection } from "./sections/FeaturesSection";
import { PlatformsSection } from "./sections/PlatformsSection";
import { TestimonialsSection } from "./sections/TestimonialsSection";
import { QuotesSection } from "./sections/QuotesSection";
import { AboutSection } from "./sections/AboutSection";
import { FaqSection } from "./sections/FaqSection";
import { CtaSection } from "./sections/CtaSection";
import { DownloadSection } from "./sections/DownloadSection";

const LandingPage: React.FC = () => {
  const { t, i18n } = useTranslation("landing");
  const [activeSection, setActiveSection] = useState("hero");
  const [showNavigation, setShowNavigation] = useState(false);

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

  // SEO and Meta tags
  useEffect(() => {
    const currentLang = i18n.language;

    // Update document title
    document.title = t("meta.title");

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", t("meta.description"));
    }

    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute("content", t("meta.keywords"));
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
      description: t("meta.description"),
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
      logger.log("Google Analytics ID not found in environment variables");
      return;
    }

    logger.log("Loading Google Analytics with ID:", gaId);

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

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800"
      dir={i18n.dir()}
    >
      {/* Language Toggle - Fixed Position */}
      <LanguageToggleFixed />

      {/* Floating Navigation */}
      <FloatingNavigation
        showNavigation={showNavigation}
        activeSection={activeSection}
        onNavigate={scrollToSection}
      />

      {/* Hero Section */}
      <HeroSection
        sectionRef={sectionRefs.hero}
        onDownloadClick={trackDownloadClick}
        onWebAppClick={trackWebAppClick}
      />

      {/* Stats Section */}
      <StatsSection />

      {/* Features Section */}
      <FeaturesSection sectionRef={sectionRefs.features} />

      {/* Platform Comparison */}
      <PlatformsSection sectionRef={sectionRefs.platforms} />

      {/* Testimonials */}
      <TestimonialsSection sectionRef={sectionRefs.testimonials} />

      {/* Torah Quotes Section */}
      <QuotesSection />

      {/* About & Endorsements Section */}
      <AboutSection sectionRef={sectionRefs.about} />

      {/* FAQ Section */}
      <FaqSection sectionRef={sectionRefs.faq} />

      {/* Final CTA */}
      <CtaSection />

      {/* Download Section */}
      <DownloadSection sectionRef={sectionRefs.download} />
    </div>
  );
};

export default LandingPage;
