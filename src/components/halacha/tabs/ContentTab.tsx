import { useTranslation } from "react-i18next";
import { HalachaTabLayout } from "../HalachaTabLayout";
import { InfoSection } from "../InfoSection";
import { FormattedText } from "../FormattedText";
import { getTypedTranslation } from "../utils";

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
  const { t } = useTranslation(namespace);

  const introduction = getTypedTranslation(
    t,
    "introduction",
    defaultIntroduction
  );

  // The 'sources' section is optional, so we handle it carefully.
  // Note: When a translation key doesn't exist, i18next returns the key as a string.
  // So checking typeof === "object" effectively validates the key exists and returned an object.
  // This approach is consistent with the project's pattern of using getTypedTranslation with defaults.
  const sourcesData = t("sources", { returnObjects: true });
  const sources =
    typeof sourcesData === "object" &&
    sourcesData !== null &&
    !Array.isArray(sourcesData)
      ? (sourcesData as { title: string; body: string })
      : null;

  const content = getTypedTranslation(t, "content", [defaultContentItem]);

  // --- NEW: compute validContent once ---
  const items = Array.isArray(content) ? content : [];
  const validContent = items.filter((item) => {
    const title = (item.title ?? "").trim();
    const body = (item.body ?? "").trim();
    return title !== "" || body !== "";
  });

  return (
    <HalachaTabLayout title={t("cardTitle")} description={t("cardDescription")}>
      {/* Introduction Section */}
      {introduction && (introduction.title ?? "").trim() !== "" && (
        <div className="mb-8 pb-6 border-b border-border">
          <FormattedText
            as="h2"
            className="text-xl font-semibold mb-3 text-foreground"
          >
            {introduction.title}
          </FormattedText>
          <FormattedText as="div" className="text-foreground leading-relaxed">
            {introduction.body}
          </FormattedText>
        </div>
      )}

      {/* Sources Section (optional) */}
      {sources && (sources.title ?? "").trim() !== "" && (
        <div className="mb-8 pb-6 border-b border-border">
          <FormattedText
            as="h2"
            className="text-xl font-semibold mb-3 text-foreground"
          >
            {sources.title}
          </FormattedText>
          <FormattedText as="div" className="text-foreground leading-relaxed">
            {sources.body}
          </FormattedText>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {validContent.length > 0 &&
          validContent.map((item, index) => (
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
