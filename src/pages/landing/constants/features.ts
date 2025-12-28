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
    imageSrc: "/features/auto-calc.webp",
  },
  {
    icon: Wallet,
    titleKey: "features.items.householdBudget.title",
    descriptionKey: "features.items.householdBudget.description",
    availability: ["web", "desktop"],
    imageSrc: "/features/budget.webp",
  },
  {
    icon: ShieldCheck,
    titleKey: "features.items.strictSecurity.title",
    descriptionKey: "features.items.strictSecurity.description",
    availability: ["web", "desktop"],
    imageSrc: "/features/security.webp",
  },
  {
    icon: Globe,
    titleKey: "features.items.accessAnywhere.title",
    descriptionKey: "features.items.accessAnywhere.description",
    availability: ["web"],
    imageSrc: "/features/access.webp",
  },
  {
    icon: Smartphone,
    titleKey: "features.items.pwaInstall.title",
    descriptionKey: "features.items.pwaInstall.description",
    availability: ["web"],
    imageSrc: "/features/pwa.webp",
  },
  {
    icon: LayoutDashboard,
    titleKey: "features.items.dashboardInsights.title",
    descriptionKey: "features.items.dashboardInsights.description",
    availability: ["web", "desktop"],
    imageSrc: "/features/dashboard.webp",
  },
  {
    icon: Calendar,
    titleKey: "features.items.smartRecurring.title",
    descriptionKey: "features.items.smartRecurring.description",
    availability: ["web", "desktop"],
    imageSrc: "/features/recurring.webp",
  },
  {
    icon: PieChart,
    titleKey: "features.items.reportsCharts.title",
    descriptionKey: "features.items.reportsCharts.description",
    availability: ["web", "desktop"],
    imageSrc: "/features/reports.webp",
  },
  {
    icon: Mail,
    titleKey: "features.items.personalReminders.title",
    descriptionKey: "features.items.personalReminders.description",
    availability: ["web"], // Email reminders usually web/cloud
    imageSrc: "/features/reminders.webp",
  },
  {
    icon: FileText,
    titleKey: "features.items.dataExport.title",
    descriptionKey: "features.items.dataExport.description",
    availability: ["web", "desktop"],
    imageSrc: "/features/export.webp",
  },
  {
    icon: Library,
    titleKey: "features.items.halachaLibrary.title",
    descriptionKey: "features.items.halachaLibrary.description",
    availability: ["web", "desktop"],
    imageSrc: "/features/halacha.webp",
  },
  {
    icon: MessageCircleQuestion,
    titleKey: "features.items.askRabbi.title",
    descriptionKey: "features.items.askRabbi.description",
    availability: ["web"],
    imageSrc: "/features/rabbi.webp",
  },
];

// Add FAQ Data here if not already in JSON, but typically FAQs are handled in landing.json
// This file mainly exports features list.
