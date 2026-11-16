import React, { type Ref } from "react";
import { useTranslation } from "react-i18next";
import { PageControls } from "@/components/layout/PageControls";
import { cn } from "@/lib/utils";

interface LanguageToggleFixedProps {
  /** The controls' box, which the scroll-linked logo dock keeps clear of. */
  controlsRef?: Ref<HTMLDivElement>;
}

export const LanguageToggleFixed: React.FC<LanguageToggleFixedProps> = ({ controlsRef }) => {
  const { i18n } = useTranslation();

  return (
    <div
      ref={controlsRef}
      className={cn("fixed top-4 z-50", i18n.dir() === "rtl" ? "right-4" : "left-4")}
    >
      <PageControls showHome={false} />
    </div>
  );
};
