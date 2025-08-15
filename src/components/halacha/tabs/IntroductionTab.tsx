import { useTranslation } from "react-i18next";
import { HalachaTabLayout } from "../HalachaTabLayout";
import { InfoSection } from "../InfoSection";
import { getTypedTranslation, formatText } from "../utils";

export const IntroductionTab = () => {
  const { t } = useTranslation("halacha-introduction");

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
    </HalachaTabLayout>
  );
};
