import React, { Suspense } from "react";
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

// A fallback component for when translations are loading
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

// --- Reusable Content Components ---

// For sections with a title and body
const InfoSection = ({ title, body }: { title: string; body: string }) => (
  <div>
    <h4 className="font-semibold text-lg mb-1">{title}</h4>
    <p className="text-muted-foreground">{body}</p>
  </div>
);

// --- Tab Content Components ---

const IntroductionTab = () => {
  const { t, i18n } = useTranslation("halacha-introduction");
  const isRtl = i18n.dir() === "rtl";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Book className="h-5 w-5 text-primary" />
          <CardTitle>{t("cardTitle")}</CardTitle>
        </div>
        <CardDescription>{t("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pl-4">
          <div
            className={`space-y-6 ${isRtl ? "text-right" : "text-left"}`}
            dir={i18n.dir()}
          >
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
  const isRtl = i18n.dir() === "rtl";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Book className="h-5 w-5 text-primary" />
          <CardTitle>{t("cardTitle")}</CardTitle>
        </div>
        <CardDescription>{t("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion
          type="single"
          collapsible
          className="w-full"
          dir={i18n.dir()}
        >
          {(
            t("questions", { returnObjects: true }) as Array<{
              question: string;
              answer: string;
            }>
          ).map((item, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger className={isRtl ? "text-right" : "text-left"}>
                {item.question}
              </AccordionTrigger>
              <AccordionContent
                className={isRtl ? "text-right pr-2" : "text-left pl-2"}
              >
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
    <Card>
      <CardHeader dir={i18n.dir()}>
        <CardTitle>{t("placeholder.title")}</CardTitle>
      </CardHeader>
      <CardContent dir={i18n.dir()}>
        <p>{t("placeholder.description")}</p>
      </CardContent>
    </Card>
  );
};

// --- Main Page Component ---
function HalachaPageContent() {
  const { t, i18n } = useTranslation("halacha-common");

  return (
    <div className="grid gap-6" dir={i18n.dir()}>
      <div className="grid gap-2 text-center">
        <h2 className="text-3xl font-bold text-foreground">{t("pageTitle")}</h2>
        <p className="text-muted-foreground text-lg">{t("pageDescription")}</p>
      </div>

      <Tabs defaultValue="introduction" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="introduction">
            {t("tabs.introduction")}
          </TabsTrigger>
          <TabsTrigger value="faq">{t("tabs.faq")}</TabsTrigger>
          <TabsTrigger value="tithes">{t("tabs.tithes")}</TabsTrigger>
          <TabsTrigger value="income">{t("tabs.income")}</TabsTrigger>
          <TabsTrigger value="expenses">{t("tabs.expenses")}</TabsTrigger>
        </TabsList>

        <TabsContent value="introduction">
          <IntroductionTab />
        </TabsContent>
        <TabsContent value="faq">
          <FaqTab />
        </TabsContent>
        <TabsContent value="tithes">
          <PlaceholderTab />
        </TabsContent>
        <TabsContent value="income">
          <PlaceholderTab />
        </TabsContent>
        <TabsContent value="expenses">
          <PlaceholderTab />
        </TabsContent>
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
