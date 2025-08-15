import { useTranslation } from "react-i18next";
import { HalachaTabLayout } from "../HalachaTabLayout";
import { formatText } from "../utils";

export const PrinciplesTab = () => {
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
    <HalachaTabLayout title={t("cardTitle")} description={t("cardDescription")}>
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
    </HalachaTabLayout>
  );
};
