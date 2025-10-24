export interface NavigationItem {
  id: string;
  labelKey: string;
  label: string;
}

export const navigationItems: NavigationItem[] = [
  { id: "hero", labelKey: "nav.home", label: "Home" },
  { id: "features", labelKey: "nav.features", label: "Features" },
  { id: "platforms", labelKey: "nav.platforms", label: "Platforms" },
  { id: "testimonials", labelKey: "nav.testimonials", label: "Testimonials" },
  { id: "about", labelKey: "nav.about", label: "About" },
  { id: "faq", labelKey: "nav.faq", label: "FAQ" },
  { id: "download", labelKey: "nav.download", label: "Download" },
];
