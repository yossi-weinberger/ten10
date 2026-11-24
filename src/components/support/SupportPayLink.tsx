import { forwardRef, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { useHoldTouchTooltipNavigation } from "@/components/ui/tooltip";
import { SUPPORT_PAYMENT_URL } from "@/lib/support-payment";

type SupportPayLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  onNavigate?: () => void;
  children: ReactNode;
};

/**
 * Opens the Takbull page. On a touch device the first tap only reveals the
 * tooltip, so the charge note is visible before the browser leaves.
 */
export const SupportPayLink = forwardRef<HTMLAnchorElement, SupportPayLinkProps>(
  function SupportPayLink({ onClick, onNavigate, children, ...props }, ref) {
    const holdNavigation = useHoldTouchTooltipNavigation();

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      if (holdNavigation(event)) return;
      onClick?.(event);
      onNavigate?.();
    };

    return (
      <a
        {...props}
        ref={ref}
        href={SUPPORT_PAYMENT_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
      >
        {children}
      </a>
    );
  },
);
