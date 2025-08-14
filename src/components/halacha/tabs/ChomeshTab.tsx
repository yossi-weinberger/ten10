import { useTranslation } from "react-i18next";
import { HalachaTabLayout } from "../HalachaTabLayout";
import { InfoSection } from "../InfoSection";
import { formatText } from "../utils";

export const ChomeshTab = () => {
  const { t } = useTranslation("halacha-chomesh");

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
    </HalachaTabLayout>
  );
};
