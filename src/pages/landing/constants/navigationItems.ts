export interface NavigationItem {
  id: string;
  labelKey: string;
  label: string;
}

export const navigationItems: NavigationItem[] = [
  { id: "hero", labelKey: "nav.home", label: "בית" },
  { id: "features", labelKey: "nav.features", label: "תכונות" },
  { id: "platforms", labelKey: "nav.platforms", label: "גרסאות" },
  { id: "testimonials", labelKey: "nav.testimonials", label: "המלצות" },
  { id: "about", labelKey: "nav.about", label: "אודות" },
  { id: "faq", labelKey: "nav.faq", label: "שאלות" },
  { id: "download", labelKey: "nav.download", label: "הורדה" },
];

