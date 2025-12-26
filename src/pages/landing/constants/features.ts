import {
  Calculator,
  Globe,
  Calendar,
  Mail,
  PieChart,
  FileText,
  Smartphone,
  MessageCircleQuestion,
  Wallet,
  LayoutDashboard,
  ShieldCheck,
  Library,
} from "lucide-react";

export type PlatformAvailability = "web" | "desktop";

export interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descriptionKey: string;
  availability: PlatformAvailability[];
  imageSrc: string; // Placeholder for image infrastructure
}

export const features: Feature[] = [
  {
    icon: Calculator,
    titleKey: "features.items.autoCalculation.title",
    descriptionKey: "features.items.autoCalculation.description",
    availability: ["web", "desktop"],
    imageSrc: "/features/auto-calc.png",
  },
  {
    icon: Wallet,
    titleKey: "features.items.householdBudget.title",
    descriptionKey: "features.items.householdBudget.description",
    availability: ["web", "desktop"],
    imageSrc: "/features/budget.png",
  },
  {
    icon: ShieldCheck,
    titleKey: "features.items.strictSecurity.title",
    descriptionKey: "features.items.strictSecurity.description",
    availability: ["web", "desktop"],
    imageSrc: "/features/security.png",
  },
  {
    icon: Globe,
    titleKey: "features.items.accessAnywhere.title",
    descriptionKey: "features.items.accessAnywhere.description",
    availability: ["web"],
    imageSrc: "/features/access.png",
  },
  {
    icon: Smartphone,
    titleKey: "features.items.pwaInstall.title",
    descriptionKey: "features.items.pwaInstall.description",
    availability: ["web"],
    imageSrc: "/features/pwa.png",
  },
  {
    icon: LayoutDashboard,
    titleKey: "features.items.dashboardInsights.title",
    descriptionKey: "features.items.dashboardInsights.description",
    availability: ["web", "desktop"],
    imageSrc: "/features/dashboard.png",
  },
  {
    icon: Calendar,
    titleKey: "features.items.smartRecurring.title",
    descriptionKey: "features.items.smartRecurring.description",
    availability: ["web", "desktop"],
    imageSrc: "/features/recurring.png",
  },
  {
    icon: PieChart,
    titleKey: "features.items.reportsCharts.title",
    descriptionKey: "features.items.reportsCharts.description",
    availability: ["web", "desktop"],
    imageSrc: "/features/reports.png",
  },
  {
    icon: Mail,
    titleKey: "features.items.personalReminders.title",
    descriptionKey: "features.items.personalReminders.description",
    availability: ["web"], // Email reminders usually web/cloud
    imageSrc: "/features/reminders.png",
  },
  {
    icon: FileText,
    titleKey: "features.items.dataExport.title",
    descriptionKey: "features.items.dataExport.description",
    availability: ["web", "desktop"],
    imageSrc: "/features/export.png",
  },
  {
    icon: Library,
    titleKey: "features.items.halachaLibrary.title",
    descriptionKey: "features.items.halachaLibrary.description",
    availability: ["web", "desktop"],
    imageSrc: "/features/halacha.png",
  },
  {
    icon: MessageCircleQuestion,
    titleKey: "features.items.askRabbi.title",
    descriptionKey: "features.items.askRabbi.description",
    availability: ["web"],
    imageSrc: "/features/rabbi.png",
  },
];

// Add FAQ Data here if not already in JSON, but typically FAQs are handled in landing.json
// This file mainly exports features list.
