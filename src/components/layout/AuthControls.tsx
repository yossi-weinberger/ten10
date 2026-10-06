import React from "react";
import { PageControls } from "./PageControls";

interface AuthControlsProps {
  showHome?: boolean;
}

export const AuthControls: React.FC<AuthControlsProps> = ({
  showHome = true,
}) => {
  return (
    <PageControls
      className="relative z-50 mb-3 self-start lg:absolute lg:top-4 lg:start-4 lg:mb-0"
      showHome={showHome}
      showLearnMore
    />
  );
};
