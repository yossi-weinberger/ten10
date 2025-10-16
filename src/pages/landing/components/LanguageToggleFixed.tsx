import { LanguageToggle } from "@/components/ui/language-toggle";

export const LanguageToggleFixed: React.FC = () => {
  return (
    <div className="fixed top-4 right-4 z-50">
      <LanguageToggle
        variant="ghost"
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
      />
    </div>
  );
};

