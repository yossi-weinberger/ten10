import React from "react";
import { PageControls } from "@/components/layout/PageControls";

export const LanguageToggleFixed: React.FC = () => {
  return <PageControls className="fixed top-4 right-4" showHome={false} />;
};
