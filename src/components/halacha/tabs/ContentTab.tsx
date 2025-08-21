import { useTranslation } from "react-i18next";
import { HalachaTabLayout } from "../HalachaTabLayout";
import { InfoSection } from "../InfoSection";
import { formatText, getTypedTranslation } from "../utils";

interface ContentTabProps {
  namespace: string;
}

// Default types to avoid errors if translation is missing
const defaultIntroduction = { title: "", body: "" };
const defaultContentItem = {
  title: "",
  body: "",
  isHighlighted: false,
  isImportant: false,
};

export const ContentTab = ({ namespace }: ContentTabProps) => {
  const { t, i18n } = useTranslation(namespace);

  const introduction = getTypedTranslation(
    t,
    "introduction",
    defaultIntroduction
  );
  // The 'sources' section is optional, so we handle it carefully.
  const sourcesKeyExists = i18n.exists("sources", { ns: namespace });
  const sources = sourcesKeyExists
    ? (t("sources", { returnObjects: true }) as { title: string; body: string })
    : null;

  const content = getTypedTranslation(t, "content", [defaultContentItem]);

  return (
    <HalachaTabLayout title={t("cardTitle")} description={t("cardDescription")}>
      {/* Introduction Section */}
      {introduction && introduction.title && (
        <div className="mb-8 pb-6 border-b border-border">
          <h2 className="text-xl font-semibold mb-3 text-foreground">
            {introduction.title}
          </h2>
          <div
            className="text-foreground leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: formatText(introduction.body),
            }}
          />
        </div>
      )}

      {/* Sources Section (optional) */}
      {sources && sources.title && (
        <div className="mb-8 pb-6 border-b border-border">
          <h2 className="text-xl font-semibold mb-3 text-foreground">
            {sources.title}
          </h2>
          <div
            className="text-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatText(sources.body) }}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {content &&
          content.some(item => item.title !== "") && // Check if any item has meaningful content
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
