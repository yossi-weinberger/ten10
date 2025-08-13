import { Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Book } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const LoadingFallback = () => (
  <div className="max-w-4xl mx-auto space-y-6">
    {/* Header skeleton */}
    <div className="text-center space-y-3">
      <div className="flex items-center justify-center gap-2">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-6 w-96 mx-auto" />
    </div>

    {/* Content skeleton */}
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-24 w-full" />
    </div>
  </div>
);

const formatText = (text: string) => {
  // Convert **text** to bold and *text* to italic
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");
};

function getTypedTranslation<T>(
  t: (key: string, options?: { returnObjects: boolean }) => any,
  key: string,
  defaultValue: T
): T {
  const result = t(key, { returnObjects: true });
  if (
    typeof result === "object" &&
    result !== null &&
    Object.keys(result).length > 0
  ) {
    return result as T;
  }
  return defaultValue;
}
const InfoSection = ({
  title,
  body,
  isHighlighted = false,
  isImportant = false,
}: {
  title: string;
  body: string;
  isHighlighted?: boolean;
  isImportant?: boolean;
}) => {
  const { i18n } = useTranslation();

  return (
    <section
      dir={i18n.dir()}
      className={`mb-6 ${
        isHighlighted
          ? "bg-blue-50 dark:bg-blue-950/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800"
          : isImportant
          ? "bg-amber-50 dark:bg-amber-950/20 p-6 rounded-lg border border-amber-200 dark:border-amber-800"
          : ""
      }`}
    >
      <h3
        className={`text-lg font-semibold mb-3 ${
          isHighlighted
            ? "text-blue-900 dark:text-blue-100"
            : isImportant
            ? "text-amber-900 dark:text-amber-100"
            : ""
        }`}
      >
        {title}
      </h3>
      <div
        className={`leading-relaxed ${
          isHighlighted
            ? "text-blue-800 dark:text-blue-200"
            : isImportant
            ? "text-amber-800 dark:text-amber-200"
            : "text-muted-foreground"
        }`}
        dangerouslySetInnerHTML={{ __html: formatText(body) }}
      />
    </section>
  );
};

const IntroductionTab = () => {
  const { t, i18n } = useTranslation("halacha-introduction");

  const introduction = getTypedTranslation(t, "introduction", {
    title: "",
    body: "",
  });
  const sources = getTypedTranslation(t, "sources", {
    title: "",
    body: "",
  });
  const content = getTypedTranslation(t, "content", [
    {
      title: "",
      body: "",
      isHighlighted: false,
      isImportant: false,
    },
  ]);
  return (
    <div className="max-w-4xl mx-auto" dir={i18n.dir()}>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Book className="h-6 w-6 text-primary rtl:order-1" />
          <h1 className="text-2xl font-bold rtl:order-2">{t("cardTitle")}</h1>
        </div>
        <p className="text-muted-foreground text-lg">{t("cardDescription")}</p>
      </div>

      {/* Content */}
      <div
        className="prose prose-slate dark:prose-invert max-w-none"
        dir={i18n.dir()}
      >
        {/* Introduction Section */}
        {introduction && (
          <div className="mb-8 pb-6 border-b border-border">
            <h2 className="text-xl font-semibold mb-3">{introduction.title}</h2>
            <div
              className="text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: formatText(introduction.body),
              }}
            />
          </div>
        )}

        {/* Sources Section */}
        {sources && (
          <div className="mb-8 pb-6 border-b border-border">
            <h2 className="text-xl font-semibold mb-3">{sources.title}</h2>
            <div
              className="text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatText(sources.body) }}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {content &&
            content.map((item, index) => (
              <InfoSection
                key={index}
                title={item.title}
                body={item.body}
                isHighlighted={item.isHighlighted}
                isImportant={item.isImportant}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

const FaqTab = () => {
  const { t, i18n } = useTranslation("halacha-faq");

  return (
    <div className="max-w-4xl mx-auto" dir={i18n.dir()}>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Book className="h-6 w-6 text-primary rtl:order-1" />
          <h1 className="text-2xl font-bold rtl:order-2">{t("cardTitle")}</h1>
        </div>
        <p className="text-muted-foreground text-lg">{t("cardDescription")}</p>
      </div>

      {/* Content */}
      <div
        className="prose prose-slate dark:prose-invert max-w-none"
        dir={i18n.dir()}
      >
        <Accordion type="single" collapsible className="w-full">
          {(
            t("questions", { returnObjects: true }) as Array<{
              question: string;
              answer: string;
            }>
          ).map((item, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger className="no-underline hover:no-underline text-base">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="ps-2">
                <div
                  className="text-muted-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatText(item.answer) }}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

const PrinciplesTab = () => {
  const { t, i18n } = useTranslation("halacha-principles");

  const introduction = t("introduction", { returnObjects: true }) as
    | { title: string; body: string }
    | undefined;
  const principles = t("principles", { returnObjects: true }) as Array<{
    number: string;
    title: string;
    body: string;
    isHighlighted?: boolean;
    isImportant?: boolean;
  }>;

  return (
    <div className="max-w-4xl mx-auto" dir={i18n.dir()}>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Book className="h-6 w-6 text-primary rtl:order-1" />
          <h1 className="text-2xl font-bold rtl:order-2">{t("cardTitle")}</h1>
        </div>
        <p className="text-muted-foreground text-lg">{t("cardDescription")}</p>
      </div>

      {/* Content */}
      <div
        className="prose prose-slate dark:prose-invert max-w-none"
        dir={i18n.dir()}
      >
        {/* Introduction Section */}
        {introduction && (
          <div className="mb-8 pb-6 border-b border-border">
            <h2 className="text-xl font-semibold mb-3">{introduction.title}</h2>
            <div
              className="text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: formatText(introduction.body),
              }}
            />
          </div>
        )}

        {/* Principles */}
        <div className="space-y-6">
          {principles &&
            principles.map((principle, index) => (
              <section
                key={index}
                className={`mb-6 ${
                  principle.isHighlighted
                    ? "bg-blue-50 dark:bg-blue-950/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800"
                    : principle.isImportant
                    ? "bg-amber-50 dark:bg-amber-950/20 p-6 rounded-lg border border-amber-200 dark:border-amber-800"
                    : ""
                }`}
                dir={i18n.dir()}
              >
                <h3
                  className={`text-lg font-semibold mb-3 flex items-center gap-3 ${
                    principle.isHighlighted
                      ? "text-blue-900 dark:text-blue-100"
                      : principle.isImportant
                      ? "text-amber-900 dark:text-amber-100"
                      : ""
                  }`}
                >
                  <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold rtl:order-1">
                    {principle.number}
                  </span>
                  <span className="rtl:order-2">{principle.title}</span>
                </h3>
                <div
                  className={`leading-relaxed ${
                    principle.isHighlighted
                      ? "text-blue-800 dark:text-blue-200"
                      : principle.isImportant
                      ? "text-amber-800 dark:text-amber-200"
                      : "text-muted-foreground"
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: formatText(principle.body),
                  }}
                />
              </section>
            ))}
        </div>
      </div>
    </div>
  );
};

const IncomeTab = () => {
  const { t, i18n } = useTranslation("halacha-income");

  const introduction = t("introduction", { returnObjects: true }) as
    | { title: string; body: string }
    | undefined;
  const content = t("content", { returnObjects: true }) as Array<{
    title: string;
    body: string;
    isHighlighted?: boolean;
    isImportant?: boolean;
  }>;

  return (
    <div className="max-w-4xl mx-auto" dir={i18n.dir()}>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Book className="h-6 w-6 text-primary rtl:order-1" />
          <h1 className="text-2xl font-bold rtl:order-2">{t("cardTitle")}</h1>
        </div>
        <p className="text-muted-foreground text-lg">{t("cardDescription")}</p>
      </div>

      {/* Content */}
      <div
        className="prose prose-slate dark:prose-invert max-w-none"
        dir={i18n.dir()}
      >
        {/* Introduction Section */}
        {introduction && (
          <div className="mb-8 pb-6 border-b border-border">
            <h2 className="text-xl font-semibold mb-3">{introduction.title}</h2>
            <div
              className="text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: formatText(introduction.body),
              }}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {content &&
            content.map((item, index) => (
              <InfoSection
                key={index}
                title={item.title}
                body={item.body}
                isHighlighted={item.isHighlighted}
                isImportant={item.isImportant}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

const ExpensesTab = () => {
  const { t, i18n } = useTranslation("halacha-expenses");

  const introduction = t("introduction", { returnObjects: true }) as
    | { title: string; body: string }
    | undefined;
  const content = t("content", { returnObjects: true }) as Array<{
    title: string;
    body: string;
    isHighlighted?: boolean;
    isImportant?: boolean;
  }>;

  return (
    <div className="max-w-4xl mx-auto" dir={i18n.dir()}>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Book className="h-6 w-6 text-primary rtl:order-1" />
          <h1 className="text-2xl font-bold rtl:order-2">{t("cardTitle")}</h1>
        </div>
        <p className="text-muted-foreground text-lg">{t("cardDescription")}</p>
      </div>

      {/* Content */}
      <div
        className="prose prose-slate dark:prose-invert max-w-none"
        dir={i18n.dir()}
      >
        {/* Introduction Section */}
        {introduction && (
          <div className="mb-8 pb-6 border-b border-border">
            <h2 className="text-xl font-semibold mb-3">{introduction.title}</h2>
            <div
              className="text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: formatText(introduction.body),
              }}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {content &&
            content.map((item, index) => (
              <InfoSection
                key={index}
                title={item.title}
                body={item.body}
                isHighlighted={item.isHighlighted}
                isImportant={item.isImportant}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

const TithesTab = () => {
  const { t, i18n } = useTranslation("halacha-tithes");

  const introduction = t("introduction", { returnObjects: true }) as
    | { title: string; body: string }
    | undefined;
  const content = t("content", { returnObjects: true }) as Array<{
    title: string;
    body: string;
    isHighlighted?: boolean;
    isImportant?: boolean;
  }>;

  return (
    <div className="max-w-4xl mx-auto" dir={i18n.dir()}>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Book className="h-6 w-6 text-primary rtl:order-1" />
          <h1 className="text-2xl font-bold rtl:order-2">{t("cardTitle")}</h1>
        </div>
        <p className="text-muted-foreground text-lg">{t("cardDescription")}</p>
      </div>

      {/* Content */}
      <div
        className="prose prose-slate dark:prose-invert max-w-none"
        dir={i18n.dir()}
      >
        {/* Introduction Section */}
        {introduction && (
          <div className="mb-8 pb-6 border-b border-border">
            <h2 className="text-xl font-semibold mb-3">{introduction.title}</h2>
            <div
              className="text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: formatText(introduction.body),
              }}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {content &&
            content.map((item, index) => (
              <InfoSection
                key={index}
                title={item.title}
                body={item.body}
                isHighlighted={item.isHighlighted}
                isImportant={item.isImportant}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

const ChomeshTab = () => {
  const { t, i18n } = useTranslation("halacha-chomesh");

  const introduction = t("introduction", { returnObjects: true }) as
    | { title: string; body: string }
    | undefined;
  const content = t("content", { returnObjects: true }) as Array<{
    title: string;
    body: string;
    isHighlighted?: boolean;
    isImportant?: boolean;
  }>;

  return (
    <div className="max-w-4xl mx-auto" dir={i18n.dir()}>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Book className="h-6 w-6 text-primary rtl:order-1" />
          <h1 className="text-2xl font-bold rtl:order-2">{t("cardTitle")}</h1>
        </div>
        <p className="text-muted-foreground text-lg">{t("cardDescription")}</p>
      </div>

      {/* Content */}
      <div
        className="prose prose-slate dark:prose-invert max-w-none"
        dir={i18n.dir()}
      >
        {/* Introduction Section */}
        {introduction && (
          <div className="mb-8 pb-6 border-b border-border">
            <h2 className="text-xl font-semibold mb-3">{introduction.title}</h2>
            <div
              className="text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: formatText(introduction.body),
              }}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {content &&
            content.map((item, index) => (
              <InfoSection
                key={index}
                title={item.title}
                body={item.body}
                isHighlighted={item.isHighlighted}
                isImportant={item.isImportant}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

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

  const tabs = [
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
    {
      value: "chomesh",
      label: t("tabs.chomesh"),
      component: <ChomeshTab />,
    },
  ];

  // Tabs slider state (similar to LanguageAndDisplaySettingsCard)
  const [activeTab, setActiveTab] = useState<string>("introduction");
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [sliderLeft, setSliderLeft] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(0);

  useEffect(() => {
    const index = tabs.findIndex((t) => t.value === activeTab);
    const current = triggerRefs.current[index];
    if (!current) return;

    const update = () => {
      setSliderLeft(current.offsetLeft ?? 0);
      setSliderWidth(current.clientWidth ?? 0);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div className="grid gap-6">
      <div className="grid gap-2 text-center">
        <h2 className="text-3xl font-bold text-foreground">{t("pageTitle")}</h2>
        <p className="text-muted-foreground text-lg">{t("pageDescription")}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="relative flex w-full rtl:flex-row-reverse bg-transparent border">
          <span
            className="absolute inset-y-1 z-0 rounded-md bg-accent shadow-sm transition-[left,width] duration-500 ease-in-out"
            style={{ left: sliderLeft, width: sliderWidth }}
          />
          {tabs.map((tab, index) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="relative z-10 flex-1 transition-colors hover:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-accent-foreground data-[state=active]:font-semibold"
              ref={(el) => {
                triggerRefs.current[index] = el;
              }}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export function HalachaPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HalachaPageContent />
    </Suspense>
  );
}
