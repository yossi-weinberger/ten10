import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { buttonHover, buttonTap } from "@/hooks/useScrollAnimation";
import { navigationItems } from "../constants/navigationItems";

interface FloatingNavigationProps {
  showNavigation: boolean;
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

export const FloatingNavigation: React.FC<FloatingNavigationProps> = ({
  showNavigation,
  activeSection,
  onNavigate,
}) => {
  const { t } = useTranslation("landing");

  if (!showNavigation) return null;

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 glass-morphism dark:glass-morphism-dark rounded-full px-6 py-3 shadow-lg border max-w-[90vw] overflow-x-auto no-scrollbar"
    >
      <div className="flex items-center gap-1 min-w-max">
        {navigationItems.map((item, index) => (
          <motion.button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            whileHover={buttonHover}
            whileTap={buttonTap}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeSection === item.id
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            aria-label={`Navigate to ${item.label}`}
          >
            {t(item.labelKey, item.label)}
          </motion.button>
        ))}
      </div>
    </motion.nav>
  );
};
