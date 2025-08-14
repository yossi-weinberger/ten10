import { useTranslation } from "react-i18next";
import { formatText } from "./utils";

interface InfoSectionProps {
  title: string;
  body: string;
  isHighlighted?: boolean;
  isImportant?: boolean;
}

export const InfoSection = ({
  title,
  body,
  isHighlighted = false,
  isImportant = false,
}: InfoSectionProps) => {
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
