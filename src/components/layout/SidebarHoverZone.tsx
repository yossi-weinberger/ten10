import type { ReactNode, MouseEvent } from "react";

interface SidebarHoverZoneProps {
  onExpandedChange: (expanded: boolean) => void;
  className?: string;
  children: ReactNode;
}

/**
 * Wrapper that expands/collapses the sidebar on hover, ignoring mouseenter
 * from portaled children (e.g., assistant panel Sheet).
 *
 * React synthetic events propagate along the React tree, not the DOM tree.
 * If a portaled child is rendered under this component in the React tree but
 * outside it in the DOM, its mouseenter events will still propagate to this
 * handler. The containment check filters those out.
 */
export function SidebarHoverZone({
  onExpandedChange,
  className,
  children,
}: SidebarHoverZoneProps) {
  const handleMouseEnter = (event: MouseEvent<HTMLDivElement>) => {
    // Ignore mouseenter from portaled children.
    if (!(event.currentTarget as Node).contains(event.target as Node)) return;
    onExpandedChange(true);
  };

  const handleMouseLeave = () => {
    onExpandedChange(false);
  };

  return (
    <div
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}
