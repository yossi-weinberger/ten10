import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Book } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const LoadingFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-10 w-1/2 mx-auto" />
    <Skeleton className="h-8 w-3/4 mx-auto" />
    <div className="p-4 border rounded-md">
      <Skeleton className="h-8 w-full mb-4" />
      <Skeleton className="h-40 w-full" />
    </div>
  </div>
);

const InfoSection = ({ title, body }: { title: string; body: string }) => {
  const { i18n } = useTranslation();
  return (
    <div dir={i18n.dir()}>
      <h4 className="font-semibold text-lg mb-1">{title}</h4>
      <p className="text-muted-foreground">{body}</p>
    </div>
  );
};

const IntroductionTab = () => {
  const { t, i18n } = useTranslation("halacha-introduction");

  return (
    <Card dir={i18n.dir()}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Book className="h-5 w-5 text-primary rtl:order-1" />
          <CardTitle className="rtl:order-2">{t("cardTitle")}</CardTitle>
        </div>
        <CardDescription>{t("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] ps-4" dir={i18n.dir()}>
          <div className="space-y-6">
            {(
              t("content", { returnObjects: true }) as Array<{
                title: string;
                body: string;
              }>
            ).map((item, index) => (
              <InfoSection key={index} title={item.title} body={item.body} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

const FaqTab = () => {
  const { t, i18n } = useTranslation("halacha-faq");
  return (
    <Card dir={i18n.dir()}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Book className="h-5 w-5 text-primary rtl:order-1" />
          <CardTitle className="rtl:order-2">{t("cardTitle")}</CardTitle>
        </div>
        <CardDescription>{t("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
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
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

const PlaceholderTab = () => {
  const { t, i18n } = useTranslation("halacha-common");
  return (
    <Card dir={i18n.dir()}>
      <CardHeader>
        <CardTitle>{t("placeholder.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{t("placeholder.description")}</p>
      </CardContent>
    </Card>
  );
};

function HalachaPageContent() {
  const { t } = useTranslation("halacha-common");

  const tabs = [
    {
      value: "introduction",
      label: t("tabs.introduction"),
      component: <IntroductionTab />,
    },
    { value: "faq", label: t("tabs.faq"), component: <FaqTab /> },
    { value: "tithes", label: t("tabs.tithes"), component: <PlaceholderTab /> },
    { value: "income", label: t("tabs.income"), component: <PlaceholderTab /> },
    {
      value: "expenses",
      label: t("tabs.expenses"),
      component: <PlaceholderTab />,
    },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-2 text-center">
        <h2 className="text-3xl font-bold text-foreground">{t("pageTitle")}</h2>
        <p className="text-muted-foreground text-lg">{t("pageDescription")}</p>
      </div>

      <Tabs defaultValue="introduction" className="w-full">
        <TabsList className="flex w-full rtl:flex-row-reverse">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
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
