import React from "react";
import { useTranslation } from "react-i18next";
import { PageControls } from "@/components/layout/PageControls";
import { cn } from "@/lib/utils";

export const LanguageToggleFixed: React.FC = () => {
  const { i18n } = useTranslation();

  return (
    <PageControls
      className={cn(
        "fixed top-4",
        i18n.dir() === "rtl" ? "right-4" : "left-4"
      )}
      showHome={false}
    />
  );
};
