import {
  Suspense,
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IntroductionTab,
  FaqTab,
  PrinciplesTab,
  IncomeTab,
  ExpensesTab,
  TithesTab,
  ChomeshTab,
} from "./tabs";

const LoadingFallback = () => (
  <div className="flex gap-8">
    <div className="w-64 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
    <div className="flex-1 space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

interface TabInfo {
  value: string;
  label: string;
  component: React.ReactNode;
}

function HalachaPageContent() {
  const { t } = useTranslation("halacha-common");

  // Pre-load all namespaces to avoid loading delays
  useTranslation("halacha-introduction");
  useTranslation("halacha-principles");
  useTranslation("halacha-faq");
  useTranslation("halacha-tithes");
  useTranslation("halacha-income");
  useTranslation("halacha-expenses");
  useTranslation("halacha-chomesh");

  const tabs: TabInfo[] = useMemo(
    () => [
      {
        value: "introduction",
        label: t("tabs.introduction"),
        component: <IntroductionTab />,
      },
      {
        value: "principles",
        label: t("tabs.principles"),
        component: <PrinciplesTab />,
      },
      { value: "faq", label: t("tabs.faq"), component: <FaqTab /> },
      { value: "tithes", label: t("tabs.tithes"), component: <TithesTab /> },
      { value: "income", label: t("tabs.income"), component: <IncomeTab /> },
      {
        value: "expenses",
        label: t("tabs.expenses"),
        component: <ExpensesTab />,
      },
      { value: "chomesh", label: t("tabs.chomesh"), component: <ChomeshTab /> },
    ],
    [t]
  );

  const [activeTab, setActiveTab] = useState(tabs[0].value);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabsListRef = useRef<HTMLDivElement | null>(null);
  const [sliderStyle, setSliderStyle] = useState({});
  const isClickScrolling = useRef(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const handleTabClick = useCallback(
    (value: string) => {
      isClickScrolling.current = true;
      setActiveTab(value);
      const index = tabs.findIndex((tab) => tab.value === value);
      const section = sectionRefs.current[index];

      if (section) {
        if (isMobile) {
          // For mobile, a simple scrollIntoView is best.
          // The `scroll-mt-24` class on the section handles the sticky header offset.
          section.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        } else {
          // For desktop, retain the custom animation for the inner scroll container.
          const scrollContainer = scrollContainerRef.current;
          if (scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const sectionRect = section.getBoundingClientRect();
            const scrollTop = scrollContainer.scrollTop;
            const targetScrollTop =
              scrollTop + (sectionRect.top - containerRect.top) - 20;

            const startTime = performance.now();
            const startPosition = scrollTop;
            const distance = targetScrollTop - startPosition;
            const duration = 800;

            function animateScroll(currentTime: number) {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const easeOutCubic = 1 - Math.pow(1 - progress, 3);
              const currentPosition = startPosition + distance * easeOutCubic;

              if (scrollContainer) {
                scrollContainer.scrollTop = currentPosition;
              }

              if (progress < 1) {
                requestAnimationFrame(animateScroll);
              }
            }
            requestAnimationFrame(animateScroll);
          }
        }
      }

      setTimeout(() => {
        isClickScrolling.current = false;
      }, 1000);
    },
    [tabs, isMobile]
  );

  // Effect for updating slider position for vertical tabs
  useEffect(() => {
    if (isMobile) return;
    const activeIndex = tabs.findIndex((tab) => tab.value === activeTab);
    const trigger = triggerRefs.current[activeIndex];
    const list = tabsListRef.current;
    if (!trigger || !list) return;

    const listRect = list.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();

    setSliderStyle({
      top: triggerRect.top - listRect.top + list.scrollTop,
      height: triggerRect.height,
      transition: "top 0.3s ease, height 0.3s ease",
    });
  }, [activeTab, tabs, isMobile]);

  // Scroll container ref for intersection observer
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Effect for scroll-based tab activation using Intersection Observer
  useEffect(() => {
    const rootElement = isMobile ? null : scrollContainerRef.current;
    if (!isMobile && !rootElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;

        // Filter visible entries and sort by intersection ratio
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries.length > 0) {
          setActiveTab(visibleEntries[0].target.id);
        }
      },
      {
        root: rootElement,
        rootMargin: isMobile ? "-100px 0px -50% 0px" : "-10% 0px -50% 0px",
        threshold: [0.1, 0.3, 0.5, 0.7],
      }
    );

    sectionRefs.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [tabs, isMobile]);

  return (
    <div className="grid gap-6">
      {/* Page Header */}
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold text-foreground">{t("pageTitle")}</h1>
        <p className="text-muted-foreground text-lg">{t("pageDescription")}</p>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col md:flex-row">
        {/* Tabs Navigation (responsive) */}
        <div className="sticky top-0 z-10 bg-background py-2 md:static md:w-64 md:flex-shrink-0 md:bg-transparent md:py-0">
          <div className="md:sticky md:top-6">
            <div
              ref={tabsListRef}
              className="relative rounded-lg border bg-card p-2 
                         flex flex-row flex-wrap gap-2
                         md:flex-col md:space-y-1 md:gap-0"
            >
              {/* Active tab slider - DESKTOP ONLY */}
              {!isMobile && (
                <div
                  className="absolute left-2 w-[calc(100%-1rem)] rounded-md bg-accent transition-all duration-300 ease-in-out rtl:right-2 rtl:left-auto z-0"
                  style={sliderStyle}
                />
              )}

              {tabs.map((tab, index) => (
                <button
                  key={tab.value}
                  ref={(el) => {
                    triggerRefs.current[index] = el;
                  }}
                  onClick={() => handleTabClick(tab.value)}
                  className={`
                    relative z-10 flex-grow rounded-md px-3 py-2 text-sm transition-all duration-200
                    md:w-full md:px-4 md:py-3 md:text-base md:text-left md:rtl:text-right
                    ${
                      activeTab === tab.value
                        ? "bg-primary text-primary-foreground md:bg-transparent md:font-semibold md:text-accent-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 md:bg-transparent md:hover:bg-muted/50 md:hover:text-foreground"
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area with Continuous Scroll */}
        <div className="flex-1 min-w-0 md:ltr:ml-8 md:rtl:mr-8">
          <div
            ref={scrollContainerRef}
            className="space-y-12 md:max-h-[calc(100vh-12rem)] md:overflow-y-auto"
          >
            {tabs.map((tab, index) => (
              <section
                key={tab.value}
                id={tab.value}
                ref={(el) => {
                  sectionRefs.current[index] = el;
                }}
                className="scroll-mt-[155px]"
              >
                {tab.component}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HalachaPageWithVerticalTabs() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HalachaPageContent />
    </Suspense>
  );
}
