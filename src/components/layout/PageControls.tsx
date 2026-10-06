import React from "react";
import { Link } from "@tanstack/react-router";
import { Home, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { AuthLearnMoreLink } from "@/components/auth/AuthLearnMoreLink";
import { useTheme, getNextToggledTheme } from "@/lib/theme";
import { useDonationStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface PageControlsProps {
  showHome?: boolean;
  showLearnMore?: boolean;
  className?: string;
}

export const PageControls: React.FC<PageControlsProps> = ({
  showHome = true,
  showLearnMore = false,
  className,
}) => {
  const { theme, setTheme } = useTheme();
  const { updateSettings } = useDonationStore();

  const toggleTheme = () => {
    const newTheme = getNextToggledTheme(theme);
    setTheme(newTheme);
    updateSettings({ theme: newTheme });
  };

  // Base styling with increased shadow for better visibility
  const baseClass = cn(
    "bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md transition-all hover:shadow-lg", // Increased shadow from sm to md, and lg on hover
    "border-0",
    "dark:hover:bg-accent dark:hover:text-accent-foreground"
  );

  const iconButtonClass = cn(
    baseClass,
    "rounded-full w-10 h-10 flex items-center justify-center"
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
        className={cn(baseClass, "rounded-full h-10 px-4")}
      />

      {showLearnMore ? (
        <AuthLearnMoreLink
          short
          variant="ghost"
          className={cn(
            baseClass,
            "lg:hidden h-10 px-3 text-xs sm:px-4 sm:text-sm max-[359px]:px-1.5"
          )}
        />
      ) : null}
    </div>
  );
};
