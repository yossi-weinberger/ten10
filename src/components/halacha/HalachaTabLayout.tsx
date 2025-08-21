import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Book } from "lucide-react";

interface HalachaTabLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export const HalachaTabLayout = ({
  title,
  description,
  children,
}: HalachaTabLayoutProps) => {
  const { i18n } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto" dir={i18n.dir()}>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Book className="h-6 w-6 text-primary rtl:order-1" />
          <h1 className="text-2xl font-bold rtl:order-2 text-foreground">
            {title}
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">{description}</p>
      </div>

      {/* Content */}
      <div
        className="prose prose-slate dark:prose-invert max-w-none"
        dir={i18n.dir()}
      >
        {children}
      </div>
    </div>
  );
};
