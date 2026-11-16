import type { ReactNode } from "react";

/**
 * Restore `children` to React's ReactNode when props inherit
 * react-i18next's HTMLAttributes augmentation.
 * Distributes over unions so discriminants like ToggleGroup `type` stay intact.
 */
export type WithReactNodeChildren<T> = T extends unknown
  ? Omit<T, "children"> & {
      children?: ReactNode;
    }
  : never;
