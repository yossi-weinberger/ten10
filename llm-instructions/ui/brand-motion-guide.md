# Brand Motion Guide (Animated Ten10 Logo)

_(Added October 2026)_

The Ten10 symbol (the "0" with the gold slice) is animated in several places: loaders, progress, success states and the 404 page. This guide explains where that code lives, the rules every brand animation follows, and how to add a new one.

The ideas were chosen from a numbered "motion lab" of prototypes. The numbers are kept in this guide so a request like "use #20 for the first load" can be traced to its implementation.

## 1. Where Things Live

| What | Where |
| --- | --- |
| Logo geometry (symbol paths re-anchored to the ring's centre, ring track, wordmark letters with their wide/square anchors, both logo viewBoxes) | `src/components/brand/logoPaths.ts` |
| Brand components | `src/components/brand/*.tsx` (named exports); `SymbolSvg` is the shared `<svg>` they draw in |
| Keyframes and `animate-brand-*` utilities | `tailwind.config.js` → the `brand-*` entries in `keyframes` and `animation` |
| Pure helpers (with Vitest tests) | `src/components/brand/*.utils.ts` |
| Sidebar sizes (widths and the logo row) | `src/components/layout/sidebarSize.ts`, used by `App`, `Sidebar` and the logo geometry |
| Static pre-loader symbol (runs before JavaScript) | Inline SVG in `index.html` (`#pre-loader`), coloured and animated by `public/loader.css`; removed by `src/lib/staticPreloader.ts` |
| Plain, non-animated logo files | `public/logo/*.svg` (unchanged) |

Do not put keyframes in component files, inline `<style>` tags or new CSS files. Add them to the `brand-*` group in `tailwind.config.js` and apply them with Tailwind classes. The only exception is the static pre-loader, whose keyframes live in `public/loader.css` because it renders before the app's CSS exists.

## 2. Components

| # | Component | What it does | Used in |
| --- | --- | --- | --- |
| 1 | `BrandSpinner` | Indeterminate loader: the symbol spins with an ease-in-out rhythm and the slice is flung outward at peak speed. | `AppLoader`, `ImportWizard` loading state, `FileUploadStep` (dropzone and sheet confirm button), `UnsubscribePage` |
| 1 | Pre-loader (`index.html` + `public/loader.css`) | Same motion as `BrandSpinner`, before any JavaScript, in the app's theme colours: a light/dark theme chosen in the app (`Ten10-ui-theme`, applied by the inline script), otherwise `prefers-color-scheme` (#34, colour fix only). It stays on screen until the app's first frame replaces it (see `src/lib/staticPreloader.ts`). | `index.html` (`#pre-loader`) |
| 39 | `BrandInlineSpinner` | Small inline loader next to text or inside a busy button: the symbol turns at a steady pace like `animate-spin`, without `BrandSpinner`'s rhythm and fling, which don't read at icon size. `tone="current"` draws the ring in the text colour for filled buttons. | Loading toasts (`sonner.tsx`), "Loading more" in the transactions table, the category and payment-method lists, the live currency rate, the desktop update checks (`VersionInfoCard`), the landing download button, `PlatformIndicator`, `LazyImage`, and busy submit buttons (login, signup, forgot / reset password, profile, opening balance, contact, bulk edit) |
| 40 | `BrandSaveIcon` | Save state inside a submit button: it turns while saving; on success it settles upright, the slice clicks in and the whole symbol morphs into a check (the ring becomes the long arm, the slice the short one). Check geometry and morph maths in `brandCheck.utils.ts`. | `FormActionButtons` (add and edit transaction, edit recurring transaction) |
| 6 | `BrandProgress` | Determinate progress: the ring fills to 90% and the slice drops in for the last 10%. Split logic in `brandProgress.utils.ts`. | `AppLoader` when it receives `progress` (Settings data import) |
| 7 | `BrandDone` | One-shot success: the last half-turn settles, the slice clicks in, a ripple leaves the ring and a check is drawn inside the 0. | `ImportResultStep` when rows were inserted |
| 12ב | `Brand404` | "404" where the 0 is the symbol; it shakes "no", the slice falls to the floor and rocks to rest. Plays once. | `NotFoundPage` |
| 38ב | `BrandSidebarLogo` | Sidebar logo row that morphs letter by letter between the wide logo (expanded) and the square logo (collapsed); the 0 turns once. Positions come from `sidebarLogoLayout.utils.ts`. | `Sidebar` |
| 15 | `HalachaReadingProgress` + `useReadingProgress` | Reading progress: the ring fills as the reader scrolls and the slice drops in at the end, with the percentage. A `role="progressbar"`; hidden in print. The indicator tracks the scroll itself, so only it re-renders while the reader scrolls. The hook works whether the content scrolls itself (desktop) or inside the app's main area (mobile), and follows height changes (accordions). | Halacha page: a card above the tabs on desktop, the start of the tab bar on mobile |
| 20 | `FirstLoadHandoff` → `AppLoader exiting` → `BrandHandoffSymbol` | First-load handoff: when the app shell appears, the loader's symbol flies into the 0 of the sidebar logo while the loader fades away. `AppLoader` uses one layout for loading and for the handoff, so nothing moves when it switches. Constants and the flight maths are in `brandHandoff.utils.ts`. | `App.tsx` |
| 38 | `LandingLogoDock` (`src/pages/landing/components/`) | Landing logo dock: as the page scrolls, the hero logo's letters reel into the 0 and its card collapses around it; the badge then flies to the side navigation's logo on `2xl` screens (where the letters reel back out) or docks as a round "back to top" button in the free top corner. Scrolling up reverses it. Maths in `logoDock.utils.ts`. | Landing page |

All components are decorative (`aria-hidden="true"`). The surrounding UI must carry the meaning in text (`role="status"` messages, headings, counts).

## 3. Sidebar Logo, First-Load Handoff and Landing Logo Dock

**Sidebar morph (38ב).** Both logo files draw the same letters (`logo.svg` draws "TEN" at 56% and "10" at full size), so `BrandSidebarLogo` draws every glyph once from its `logo-wide.svg` path and moves it with a CSS `transform` per state. `getSidebarLogoLayout(dir)` turns the row's geometry (`SIDEBAR_LOGO_ROW`: the sidebar's widths and the row height from `SIDEBAR_SIZE`, plus the logos' own sizes in the row) into those transforms for RTL and LTR. Rules:

- Transitions use `duration-300`, the same as the sidebar's width (`ui-component-guidelines.md` §10.1). Do not stagger or lengthen them.
- `BrandSidebarLogo` renders the whole row: the SVG is as wide as the expanded sidebar, pinned to the inline-start edge, and the row clips it as the sidebar narrows.
- The sidebar's widths and the row height live in `SIDEBAR_SIZE` (`src/components/layout/sidebarSize.ts`) as Tailwind classes plus px; `App`, `Sidebar` and the logo all use it, and a test checks the px against the classes. The SVG is sized with the classes, so it scales with the sidebar if the root font size changes.

**First-load handoff (20).** `App.tsx` decides once, the first time the app shell renders, whether the handoff can run: only when the desktop sidebar is visible (`md` and up, not a full-screen page) and not after the desktop lock screen. It then renders `<FirstLoadHandoff />` on top of the shell, which shows `<AppLoader exiting />` and removes itself once both the symbol and the fading background are done (its own state, so `App` doesn't re-render). That overlay ignores pointer events, fades its background and text, and `BrandHandoffSymbol` flies to the element marked `data-brand-zero` (a ring-sized circle in `BrandSidebarLogo`). While it runs, `<html>` carries `data-brand-handoff`, which hides the sidebar's own 0 (`[[data-brand-handoff]_&]:opacity-0`) so the two never overlap. With reduced motion, or without a target, the loader fades out instead.

**Landing logo dock (38).** `LandingPage` gives `LandingLogoDock` refs to the hero logo (`AnimatedLogo`'s card and SVG), the side navigation's logo and the page controls, and picks the target: the navigation on `2xl` (where it is shown), the corner below that. Rules:

- The badge is a fixed overlay that copies the hero logo exactly (same glass classes, same paths and colours), so the hero hides as soon as the page leaves the top and shows again at the top, with hover intact.
- `getDockPose` is a pure function of the scroll, the hero's live box and the dock; it is drawn straight to the DOM once per frame (no React re-renders). The overlay keeps updating while the hero or the navigation still move (their entrance animations), then stops.
- Wide screens reel over 0–200px and fly over 150–400px; phones are shorter (`DOCK_TIMING`) and wait below the page controls, so the badge leaves the hero title quickly and never sits under the controls.
- While the dock owns the navigation's logo slot, `FloatingNavigation` hides its own logo (`hideLogo`). The corner button scrolls to the hero like the navigation's home link, and its size and position match `DOCK_CORNER` (`top-4`, inline end, `h-10 w-10`).
- `logo-wide.svg`'s colours (`LOGO_FILE_COLORS`) are used here, as in `AnimatedLogo`, not theme tokens, because the badge must match the hero logo pixel for pixel.

## 4. Geometry and Colours

- Paths in `logoPaths.ts` put the ring's centre at `(0, 0)`. Rotations and scales of parts inside the symbol use `origin-[0_0]` (SVG's default `transform-box: view-box`). Loops turn the `<svg>` element instead (see section 6).
- A part that rotates around its own centre (e.g. the falling slice) uses `[transform-box:fill-box] origin-center`.
- `SYMBOL_VIEWBOX` is tight around the symbol at rest. Components set `overflow-visible` so motion can leave the box without changing the component's size. Existing size classes (`h-14 w-14`, …) keep the same visual size as the old `<img src="/logo/symbol.svg">`.
- Colours come from theme tokens: ring `fill-primary`, slice `fill-accent`, strokes `stroke-primary`. In dark mode the ring automatically uses the lighter teal. Do not hardcode `#11676a` / `#f0c000` in components.
- Inside filled buttons the ring uses the text colour (`fill-current`: `BrandInlineSpinner tone="current"`, `BrandSaveIcon`), because teal would vanish into a teal button. The slice stays gold.
- Exception: `public/loader.css` repeats the HSL values of the theme tokens (`--background`, `--primary`, `--muted-foreground`, `--accent`), and `index.html` the symbol paths, because they render before the app's code and CSS. `scripts/preloader-sync-contract.test.ts` fails if they drift from `src/index.css`, `logoPaths.ts` or the `brand-*` animations.
- A `<mask>` that reveals a shape uses `stroke="white"`. That is mask luminance, not a theme colour.
- Mask/clip ids must be unique per instance: build them from `useId()` with non-alphanumeric characters stripped (see `BrandProgress`).

## 5. Reduced Motion: Reduce, Don't Remove

Browsers never switch animations off by themselves; the site decides. Users whose system asks for reduced motion must get the same information without the movement. That includes people who turned on the OS accessibility setting, and many virtual-desktop and remote-desktop sessions, where Windows turns animations off by default.

Rules:

1. Apply brand animations with `motion-safe:` only, e.g. `motion-safe:animate-brand-spin`.
2. Every component defines what reduced-motion users see:
   - **Loaders** switch to a gentle pulse (`motion-reduce:animate-brand-pulse`), so it is still obvious that something is loading.
   - **One-shot animations** (`BrandDone`, `Brand404`) show their final state immediately. `BrandSaveIcon` pulses while saving and shows the check without the morph. Put the final pose in the base classes and let the `motion-safe:` animation start from the initial pose (`animation-fill-mode: both`). Leave the end keyframe out, so the animation ends on the base classes and the final pose is written once (see `brand-404-*`).
   - **Values driven by data** (`BrandProgress`) still update, but without travel: the slice fades in place instead of dropping (`useReducedMotion` from `framer-motion`).
   - **State changes** (`BrandSidebarLogo`) switch instantly (`motion-reduce:transition-none`), and the first-load handoff becomes a short fade.
   - **Scroll-linked motion** (`LandingLogoDock`): the hero logo stays whole and scrolls away with the page, the corner button fades in once the page has scrolled, and the side navigation keeps its own logo.
3. The pre-loader handles this with `@media (prefers-reduced-motion: reduce)` in `public/loader.css`.

This matches the rest of the app, which already uses `motion-safe:` utilities and `useReducedMotion` (landing page, `PrepareStep`).

## 6. Performance

These animations run while the app is busy (loading, rendering the first page, scrolling), so they must not add main-thread work. Measured in Chromium on this branch:

1. **Loops turn the `<svg>` box, not shapes inside it.** Transform and opacity animations on an HTML-level box (the `<svg>` element, like the old `<img>`) run off the main thread, so a loader keeps turning while JavaScript loads. Smaller movements inside the drawing (the slice's fling) may run on the main thread; if they pause, the loader still turns. `BrandSpinner` and the static pre-loader both work this way.
2. **framer-motion: animate `transform` as one string** when the animation runs while the app is busy (the first-load flight). `x` / `y` / `scale` / `rotate` are animated on the main thread and froze when it was blocked; a full `transform` string runs through the Web Animations API and kept moving.
3. **No CSS transitions on values that already move continuously.** `stroke-dashoffset` (the `BrandProgress` fill) can't be animated off the main thread. With a 300 ms transition on every 1% of scroll, the halacha indicator repainted on every frame. Use `smooth={false}` when the value follows the scroll; keep the default for progress that jumps (imports).
4. **Keep scroll-driven state in the smallest component.** `useReadingProgress` re-renders its caller on every percent, so it is called from the indicator, not the page that holds the content. It skips frames where the whole-number percent didn't change, looks up the nearest scrolling box only when sizes change (it reads computed styles), and only reacts to that box's own scroll: on desktop the content scrolls itself inside a page that also scrolls, and the page's scroll doesn't change the progress.
5. **One-shot state that ends an animation lives with the animation** (`FirstLoadHandoff`), not in `App`, so finishing it doesn't re-render the whole app.
6. **`BrandSaveIcon` turns with the Web Animations API on the `<svg>`**, which still runs off the main thread like a CSS loop, so it can read the angle when the save finishes and settle upright from there. The check morph interpolates two path outlines on the main thread for 300 ms, after the save, when nothing else is running. The outlines are sampled once per page with `getPointAtLength`; where SVG geometry is missing (tests) the check shows without the morph.

## 7. Accessibility Timing (WCAG 2.2.2)

Israeli accessibility regulations follow WCAG at level AA. Success criterion 2.2.2 (Pause, Stop, Hide) requires a way to stop anything that moves on its own for more than 5 seconds next to other content. Loading indicators are exempt.

- Loaders may loop while the thing they represent is loading.
- Everything else plays once (`1` iteration) or only in response to the user (hover, scroll, drag). Do not add ambient loops.

## 8. Adding a Brand Animation

1. Add keyframes and an `animate-brand-*` utility to the `brand-*` group in `tailwind.config.js`. Keep durations, delays and fill modes in the utility so components only reference class names.
2. Build the component in `src/components/brand/` from `logoPaths.ts`, drawn in `SymbolSvg`. Use a named export and an optional `className` for size.
3. Decide the reduced-motion behaviour (section 5) and implement it in the same component.
4. Check it against the performance rules (section 6): loops on the `<svg>` box, no transitions on continuously changing values.
5. Keep any math in a `*.utils.ts` file with a Vitest test next to it.
6. Use semantic colour classes and check light mode, dark mode, RTL and LTR.
7. Update the tables in this guide.

## 9. Still Open

Ideas from the motion lab that are not built. Numbers refer to the motion-lab ideas.

| # | Idea | Status |
| --- | --- | --- |
| 14 | Pull to refresh with the symbol | Under consideration. Touch devices only (mobile web, installed PWA, Android TWA). |
| 34 | App-icon launch | Only the colour fix is built (see the pre-loader row). The animated version is not planned: installed app only, and the OS splash itself cannot be animated. |

Not chosen: 19 (favicon progress), 10א / 10ב (coin / check morph), 18 (celebration), 12 (sync-error state), 21 / 22 (hero wordmark), 27, 5, 13, 41 (the slice leaves the ring on income and returns on a donation), 42 (a symbol ring on the dashboard's tithe balance card).
