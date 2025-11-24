import {
  Calculator,
  Globe,
  Calendar,
  Mail,
  PieChart,
  FileText,
  Smartphone,
  Star,
  MessageCircleQuestion,
} from "lucide-react";

export interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descriptionKey: string;
}

export const features: Feature[] = [
  {
    icon: Calculator,
    titleKey: "features.items.autoCalculation.title",
    descriptionKey: "features.items.autoCalculation.description",
  },
  {
    icon: Globe,
    titleKey: "features.items.accessAnywhere.title",
    descriptionKey: "features.items.accessAnywhere.description",
  },
  {
    icon: Calendar,
    titleKey: "features.items.smartRecurring.title",
    descriptionKey: "features.items.smartRecurring.description",
  },
  {
    icon: Mail,
    titleKey: "features.items.personalReminders.title",
    descriptionKey: "features.items.personalReminders.description",
  },
  {
    icon: PieChart,
    titleKey: "features.items.reportsCharts.title",
    descriptionKey: "features.items.reportsCharts.description",
  },
  {
    icon: FileText,
    titleKey: "features.items.dataExport.title",
    descriptionKey: "features.items.dataExport.description",
  },
  {
    icon: Smartphone,
    titleKey: "features.items.pwaInstall.title",
    descriptionKey: "features.items.pwaInstall.description",
  },
  {
    icon: Star,
    titleKey: "features.items.chomesh.title",
    descriptionKey: "features.items.chomesh.description",
  },
  {
    icon: MessageCircleQuestion,
    titleKey: "features.items.askRabbi.title",
    descriptionKey: "features.items.askRabbi.description",
  },
];
