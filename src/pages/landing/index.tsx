import { useTranslation } from "react-i18next";
import { useEffect, useState, useRef } from "react";
import { logger } from "@/lib/logger";
import { LanguageToggleFixed } from "./components/LanguageToggleFixed";
import { FloatingNavigation } from "./components/FloatingNavigation";
import { BackToTopButton } from "./components/BackToTopButton";
import { ScreenshotCarousel } from "./components/ScreenshotCarousel";
import { HeroSection } from "./sections/HeroSection";
import { StatsSection } from "./sections/StatsSection";
import { ProblemSection } from "./sections/ProblemSection";
import { FeaturesSection } from "./sections/FeaturesSection";
import { PlatformsSection } from "./sections/PlatformsSection";
import { TestimonialsSection } from "./sections/TestimonialsSection";
import { QuotesSection } from "./sections/QuotesSection";
import { AboutSection } from "./sections/AboutSection";
import { FaqSection } from "./sections/FaqSection";
import { DownloadSection } from "./sections/DownloadSection";

const getScrollableParent = (element: HTMLElement | null) => {
  let parent = element?.parentElement ?? null;

  while (parent) {
    const { overflowY } = window.getComputedStyle(parent);
    const canScroll = parent.scrollHeight > parent.clientHeight;

    if (canScroll && (overflowY === "auto" || overflowY === "scroll")) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return window;
};

const isWindowScrollTarget = (
  scrollTarget: HTMLElement | Window
): scrollTarget is Window => scrollTarget === window;

const getScrollTop = (scrollTarget: HTMLElement | Window) =>
  isWindowScrollTarget(scrollTarget)
    ? window.scrollY
    : scrollTarget.scrollTop;

const smoothScrollToElement = (
  element: HTMLElement,
  pageElement: HTMLElement | null
) => {
  const scrollTarget = getScrollableParent(pageElement);

  if (isWindowScrollTarget(scrollTarget)) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const containerRect = scrollTarget.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const targetScrollTop =
    scrollTarget.scrollTop + (elementRect.top - containerRect.top) - 20;
  const startPosition = scrollTarget.scrollTop;
  const distance = targetScrollTop - startPosition;
  const startTime = performance.now();
  const duration = 800;

  const animateScroll = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOutCubic = 1 - Math.pow(1 - progress, 3);

    scrollTarget.scrollTop = startPosition + distance * easeOutCubic;

    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  };

  requestAnimationFrame(animateScroll);
};

const LandingPage: React.FC = () => {
  const { t, i18n } = useTranslation("landing");
  const [activeSection, setActiveSection] = useState("hero");
  const [showNavigation, setShowNavigation] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrolling = useRef(false);
  const programmaticScrollTimeout = useRef<number | null>(null);

  // Section refs for intersection observer
  // Note: Only sections that appear in navigationItems should be tracked here
  const sectionRefs = {
    hero: useRef<HTMLElement>(null),
    features: useRef<HTMLElement>(null),
    screenshots: useRef<HTMLElement>(null),
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
      isProgrammaticScrolling.current = true;
      setActiveSection(sectionId);
      smoothScrollToElement(element, pageRef.current);

      if (programmaticScrollTimeout.current) {
        window.clearTimeout(programmaticScrollTimeout.current);
      }

      programmaticScrollTimeout.current = window.setTimeout(() => {
        isProgrammaticScrolling.current = false;
      }, 900);
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
      if (isProgrammaticScrolling.current) return;

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

    // Show navigation after scroll. The landing page scrolls inside App's
    // overflow container, not always on window.
    const scrollTarget = getScrollableParent(pageRef.current);
    const handleScroll = () => {
      const scrollTop = getScrollTop(scrollTarget);
      setShowNavigation(scrollTop > 100);

      const maxScroll =
        isWindowScrollTarget(scrollTarget)
          ? document.documentElement.scrollHeight - window.innerHeight
          : scrollTarget.scrollHeight - scrollTarget.clientHeight;

      if (maxScroll - scrollTop < 8) {
        setActiveSection("download");
      }
    };

    handleScroll();
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      scrollTarget.removeEventListener("scroll", handleScroll);
      if (programmaticScrollTimeout.current) {
        window.clearTimeout(programmaticScrollTimeout.current);
      }
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

  // Google Analytics — load once on mount
  useEffect(() => {
    const gaId = import.meta.env.VITE_G_ANALYTICS_ID;
    if (!gaId) {
      logger.log("Google Analytics ID not found in environment variables");
      return;
    }

    // Guard: skip if already loaded (e.g. HMR re-mount)
    if (document.querySelector('script[src*="googletagmanager"]')) return;

    logger.log("Loading Google Analytics with ID:", gaId);

    const gaScript = document.createElement("script");
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(gaScript);

    const gaConfigScript = document.createElement("script");
    gaConfigScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', {
        page_title: 'Ten10 Landing Page',
        page_location: window.location.href
      });
    `;
    document.head.appendChild(gaConfigScript);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track language changes after GA is ready
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).gtag) return;
    (window as any).gtag("event", "language_view", {
      language: i18n.language,
    });
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
      ref={pageRef}
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

      <BackToTopButton
        pageRef={pageRef}
        targetRef={sectionRefs.hero}
      />

      {/* Hero Section */}
      <HeroSection
        sectionRef={sectionRefs.hero}
        onDownloadClick={trackDownloadClick}
        onWebAppClick={trackWebAppClick}
      />

      {/* Stats Section */}
      <StatsSection />

      {/* Problem Section - The "WHY" */}
      <ProblemSection />

      {/* Features Section */}
      <FeaturesSection sectionRef={sectionRefs.features} />

      {/* Screenshots Section */}
      <section
        id="screenshots"
        ref={sectionRefs.screenshots}
        className="bg-card/60 py-20 dark:bg-card/40"
      >
        <ScreenshotCarousel />
      </section>

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

      {/* Download Section */}
      <DownloadSection sectionRef={sectionRefs.download} />
    </div>
  );
};

export default LandingPage;
