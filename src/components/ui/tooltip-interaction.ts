import * as React from "react";

export type TooltipInteractionContextValue = {
  isTouchLikeDevice: boolean;
  isOpen: boolean;
  toggle: () => void;
  markPointerDown: () => void;
};

export const TooltipInteractionContext =
  React.createContext<TooltipInteractionContextValue | null>(null);

/** On a touch device, the first tap shows the tooltip and does not follow the link. */
export function useHoldTouchTooltipNavigation() {
  const interaction = React.useContext(TooltipInteractionContext);
  return (event: { preventDefault(): void }) => {
    if (!interaction?.isTouchLikeDevice || interaction.isOpen) return false;
    event.preventDefault();
    interaction.toggle();
    return true;
  };
}
