import React from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Home, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useTheme } from "@/lib/theme";
import { useDonationStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface PageControlsProps {
  showHome?: boolean;
  className?: string;
}

export const PageControls: React.FC<PageControlsProps> = ({
  showHome = true,
  className,
}) => {
  const { theme, setTheme } = useTheme();
  const { updateSettings } = useDonationStore();

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    updateSettings({ theme: newTheme });
  };

  // Reverting to the simpler original design requested by the user
  // bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
  const baseClass =
    "bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm transition-colors";

  const iconButtonClass = cn(
    baseClass,
    "rounded-full w-10 h-10 flex items-center justify-center border-0"
  );

  return (
    <div className={cn("flex items-center gap-2 z-50", className)}>
      {showHome && (
        <Button variant="ghost" size="icon" asChild className={iconButtonClass}>
          <Link to="/landing" aria-label="Home">
            <Home className="h-5 w-5" />
          </Link>
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className={iconButtonClass}
        aria-label="Toggle theme"
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>

      <LanguageToggle
        variant="ghost"
        className={cn(baseClass, "rounded-full h-10 px-4 border-0")}
      />
    </div>
  );
};
