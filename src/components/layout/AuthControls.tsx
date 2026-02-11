import React from "react";
import { PageControls } from "./PageControls";

interface AuthControlsProps {
  showHome?: boolean;
}

export const AuthControls: React.FC<AuthControlsProps> = ({
  showHome = true,
}) => {
  return (
    <PageControls className="absolute top-4 start-4" showHome={showHome} />
  );
};
