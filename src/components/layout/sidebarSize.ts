/**
 * Sizes of the desktop sidebar: Tailwind classes (written out in full so Tailwind
 * generates them) and the same sizes in px at the default 16px root font size, which
 * `sidebarSize.test.ts` checks against the classes.
 *
 * The sidebar logo's geometry is computed from the px values and drawn in an SVG sized
 * with the classes, so it scales with the sidebar when the root font size changes.
 */
export const SIDEBAR_SIZE = {
  expandedWidth: { className: "w-44", px: 176 },
  collapsedWidth: { className: "w-16", px: 64 },
  logoRowHeight: { className: "h-9", px: 36 },
} as const;
