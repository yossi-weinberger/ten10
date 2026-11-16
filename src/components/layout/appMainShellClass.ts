/**
 * Classes for the shell `<main>` when the mobile top bar is in the layout.
 *
 * The bar is `52px + env(safe-area-inset-top)`. `4rem` (the old `pt-16`) clears
 * that bar by 12px when the inset is 0; adding the inset keeps the same gap on
 * notched phones. `md:pt-6` stays the wide layout. `mobile-landscape` repeats
 * the inset padding because that variant also shows the bar and, via `:is()`,
 * outranks `md` when both match (short landscape phones are often >=768px wide).
 *
 * `--mobile-topbar-h` is set for the same two cases (max-width 767px, and
 * coarse pointer with max-height 500px) but defaults to 0px, so the padding
 * uses `4rem + env(safe-area-inset-top)` directly and stays equal to `pt-16`
 * when the inset is 0.
 */
export const APP_MAIN_SHELL_CLASS =
  "container px-4 md:px-6 max-md:pr-[max(1rem,env(safe-area-inset-right))] max-md:pl-[max(1rem,env(safe-area-inset-left))] mobile-landscape:pr-[max(1rem,env(safe-area-inset-right))] mobile-landscape:pl-[max(1rem,env(safe-area-inset-left))] pt-[calc(4rem+env(safe-area-inset-top))] md:pt-6 mobile-landscape:pt-[calc(4rem+env(safe-area-inset-top))] pb-24 md:pb-6 mobile-landscape:pb-32";
