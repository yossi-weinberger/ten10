import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

interface LanguageToggleProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
}

export function LanguageToggle({
  className,
  variant = "outline",
}: LanguageToggleProps) {
  const { i18n } = useTranslation();

  const handleLanguageChange = () => {
    const newLang = i18n.language === "he" ? "en" : "he";
    (i18n as any).changeLanguage(newLang);
  };

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleLanguageChange}
      className={className}
      aria-label={i18n.language === "he" ? "Switch to English" : "עבור לעברית"}
    >
      <Globe className="h-4 w-4 mr-2" />
      {i18n.language === "he" ? "English" : "עברית"}
    </Button>
  );
}
