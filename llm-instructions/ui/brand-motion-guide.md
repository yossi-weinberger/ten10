# Brand Motion Guide (Animated Ten10 Logo)

_(Added October 2026)_

The Ten10 symbol (the "0" with the gold slice) is animated in several places: loaders, progress, success states and the 404 page. This guide explains where that code lives, the rules every brand animation follows, and how to add a new one.

The ideas were chosen from a numbered "motion lab" of prototypes. The numbers are kept in this guide so a request like "use #20 for the first load" can be traced to its implementation.

## 1. Where Things Live

| What | Where |
| --- | --- |
| Logo geometry (symbol paths re-anchored to the ring's centre, ring track, wordmark letters with their wide/square anchors, both logo viewBoxes) | `src/components/brand/logoPaths.ts` |
| Brand components | `src/components/brand/*.tsx` (named exports) |
| Keyframes and `animate-brand-*` utilities | `tailwind.config.js` → the `brand-*` entries in `keyframes` and `animation` |
| Pure helpers (with Vitest tests) | `src/components/brand/*.utils.ts` |
| Static pre-loader symbol (runs before JavaScript) | Inline SVG in `index.html` (`#pre-loader`), coloured and animated by `public/loader.css` |
| Plain, non-animated logo files | `public/logo/*.svg` (unchanged) |

Do not put keyframes in component files, inline `<style>` tags or new CSS files. Add them to the `brand-*` group in `tailwind.config.js` and apply them with Tailwind classes. The only exception is the static pre-loader, whose keyframes live in `public/loader.css` because it renders before the app's CSS exists.

## 2. Components

| # | Component | What it does | Used in |
| --- | --- | --- | --- |
| 1 | `BrandSpinner` | Indeterminate loader: the symbol spins with an ease-in-out rhythm and the slice is flung outward at peak speed. | `AppLoader`, `ImportWizard` loading state, `FileUploadStep` (dropzone and sheet confirm button) |
| 1 | Pre-loader (`index.html` + `public/loader.css`) | Same motion as `BrandSpinner`, before any JavaScript. It uses the app's theme colours: the inline script in `index.html` applies a light/dark theme chosen in the app (`Ten10-ui-theme`), otherwise it follows `prefers-color-scheme`. This removes the old dark-navy flash for light-theme users and after the installed app's white splash screen (#34, colour fix only). | `index.html` (`#pre-loader`) |
| 6 | `BrandProgress` | Determinate progress: the ring fills to 90% and the slice drops in for the last 10%. Split logic in `brandProgress.utils.ts`. | `AppLoader` when it receives `progress` (Settings data import) |
| 7 | `BrandDone` | One-shot success: the last half-turn settles, the slice clicks in, a ripple leaves the ring and a check is drawn inside the 0. | `ImportResultStep` when rows were inserted |
| 12ב | `Brand404` | "404" where the 0 is the symbol; it shakes "no", the slice falls to the floor and rocks to rest. Plays once. | `NotFoundPage` |
| 38ב | `BrandSidebarLogo` | Sidebar logo that morphs letter by letter between the wide logo (expanded) and the square logo (collapsed); the 0 turns once. Positions come from `sidebarLogoLayout.utils.ts`. | `Sidebar` |
| 15 | `HalachaReadingProgress` + `useReadingProgress` | Reading progress: the ring fills as the reader scrolls and the slice drops in at the end, with the percentage. A `role="progressbar"`; hidden in print. The indicator tracks the scroll itself, so only it re-renders while the reader scrolls. The hook works whether the content scrolls itself (desktop) or inside the app's main area (mobile), and follows height changes (accordions). | Halacha page: a card above the tabs on desktop, the start of the tab bar on mobile |
| 20 | `FirstLoadHandoff` → `AppLoader exiting` → `BrandHandoffSymbol` | First-load handoff: when the app shell appears, the loader's symbol flies into the 0 of the sidebar logo while the loader fades away. Constants and the flight maths are in `brandHandoff.utils.ts`. | `App.tsx` |

All components are decorative (`aria-hidden="true"`). The surrounding UI must carry the meaning in text (`role="status"` messages, headings, counts).

## 3. Sidebar Logo and First-Load Handoff

**Sidebar morph (38ב).** Both logo files draw the same letters (`logo.svg` draws "TEN" at 56% and "10" at full size), so `BrandSidebarLogo` draws every glyph once from its `logo-wide.svg` path and moves it with a CSS `transform` per state. `getSidebarLogoLayout(dir)` turns the sidebar's real measurements (`w-44` / `w-16`, a 36px row, `h-7` wide logo behind `px-4`, an `h-9 w-9` square logo centred in the rail) into those transforms for RTL and LTR. Rules:

- Transitions use `duration-300`, the same as the sidebar's width (`ui-component-guidelines.md` §10.1). Do not stagger or lengthen them.
- The SVG is as wide as the expanded sidebar and pinned to the inline-start edge of a `relative`, `overflow-hidden` row, so the collapsing rail clips it.
- If the sidebar's measurements change, update `SIDEBAR_LOGO_ROW` and its tests.

**First-load handoff (20).** `App.tsx` decides once, the first time the app shell renders, whether the handoff can run: only when the desktop sidebar is visible (`md` and up, not a full-screen page) and not after the desktop lock screen. It then renders `<FirstLoadHandoff />` on top of the shell, which shows `<AppLoader exiting />` and removes itself when the flight ends (its own state, so `App` doesn't re-render). That overlay ignores pointer events, fades its background and text, and `BrandHandoffSymbol` flies to the element marked `data-brand-zero` (a ring-sized circle in `BrandSidebarLogo`). While it runs, `<html>` carries `data-brand-handoff`, which hides the sidebar's own 0 (`[[data-brand-handoff]_&]:opacity-0`) so the two never overlap. With reduced motion, or without a target, the loader fades out instead.

## 4. Geometry and Colours

- Paths in `logoPaths.ts` put the ring's centre at `(0, 0)`. Rotations and scales of parts inside the symbol use `origin-[0_0]` (SVG's default `transform-box: view-box`). Turning the whole symbol is done on the `<svg>` element instead (see section 6).
- A part that rotates around its own centre (e.g. the falling slice) uses `[transform-box:fill-box] origin-center`.
- `SYMBOL_VIEWBOX` is tight around the symbol at rest. Components set `overflow-visible` so motion can leave the box without changing the component's size. Existing size classes (`h-14 w-14`, …) keep the same visual size as the old `<img src="/logo/symbol.svg">`.
- Colours come from theme tokens: ring `fill-primary`, slice `fill-accent`, strokes `stroke-primary`. In dark mode the ring automatically uses the lighter teal. Do not hardcode `#11676a` / `#f0c000` in components.
- Exception: `public/loader.css` repeats the HSL values of the theme tokens (`--background`, `--primary`, `--muted-foreground`, `--accent`) because it renders before `src/index.css`. Keep them in sync when the theme changes.
- A `<mask>` that reveals a shape uses `stroke="white"`. That is mask luminance, not a theme colour.
- Mask/clip ids must be unique per instance: build them from `useId()` with non-alphanumeric characters stripped (see `BrandProgress`).

## 5. Reduced Motion: Reduce, Don't Remove

Browsers never switch animations off by themselves; the site decides. Users whose system asks for reduced motion must get the same information without the movement. That includes people who turned on the OS accessibility setting, and many virtual-desktop and remote-desktop sessions, where Windows turns animations off by default.

Rules:

1. Apply brand animations with `motion-safe:` only, e.g. `motion-safe:animate-brand-spin`.
2. Every component defines what reduced-motion users see:
   - **Loaders** switch to a gentle pulse (`motion-reduce:animate-brand-pulse`), so it is still obvious that something is loading.
   - **One-shot animations** (`BrandDone`, `Brand404`) show their final state immediately. Put the final pose in the base classes and let the `motion-safe:` animation start from the initial pose (`animation-fill-mode: both`).
   - **Values driven by data** (`BrandProgress`) still update, but without travel: the slice fades in place instead of dropping (`useReducedMotion` from `framer-motion`).
   - **State changes** (`BrandSidebarLogo`) switch instantly (`motion-reduce:transition-none`), and the first-load handoff becomes a short fade.
3. The pre-loader handles this with `@media (prefers-reduced-motion: reduce)` in `public/loader.css`.

This matches the rest of the app, which already uses `motion-safe:` utilities and `useReducedMotion` (landing page, `PrepareStep`).

## 6. Performance

These animations run while the app is busy (loading, rendering the first page, scrolling), so they must not add main-thread work. Measured in Chromium on this branch:

1. **Loops turn the `<svg>` box, not shapes inside it.** Transform and opacity animations on an HTML-level box (the `<svg>` element, like the old `<img>`) run off the main thread, so a loader keeps turning while JavaScript loads. Smaller movements inside the drawing (the slice's fling) may run on the main thread; if they pause, the loader still turns. `BrandSpinner` and the static pre-loader both work this way.
2. **framer-motion: animate `transform` as one string** when the animation runs while the app is busy (the first-load flight). `x` / `y` / `scale` / `rotate` are animated on the main thread and froze when it was blocked; a full `transform` string runs through the Web Animations API and kept moving.
3. **No CSS transitions on values that already move continuously.** `stroke-dashoffset` (the `BrandProgress` fill) can't be animated off the main thread. With a 300 ms transition on every 1% of scroll, the halacha indicator repainted on every frame. Use `smooth={false}` when the value follows the scroll; keep the default for progress that jumps (imports).
4. **Keep scroll-driven state in the smallest component.** `useReadingProgress` re-renders its caller on every percent, so it is called from the indicator, not the page that holds the content. It also skips frames where the whole-number percent didn't change, and looks up the nearest scrolling box only when sizes change (it reads computed styles), not on every scroll frame. A scroll of an outer area never replaces that box: on desktop the content scrolls itself inside a page that also scrolls, and measuring against the page would show 100%.
5. **One-shot state that ends an animation lives with the animation** (`FirstLoadHandoff`), not in `App`, so finishing it doesn't re-render the whole app.

## 7. Accessibility Timing (WCAG 2.2.2)

Israeli accessibility regulations follow WCAG at level AA. Success criterion 2.2.2 (Pause, Stop, Hide) requires a way to stop anything that moves on its own for more than 5 seconds next to other content. Loading indicators are exempt.

- Loaders may loop while the thing they represent is loading.
- Everything else plays once (`1` iteration) or only in response to the user (hover, scroll, drag). Do not add ambient loops.

## 8. Adding a Brand Animation

1. Add keyframes and an `animate-brand-*` utility to the `brand-*` group in `tailwind.config.js`. Keep durations, delays and fill modes in the utility so components only reference class names.
2. Build the component in `src/components/brand/` from `logoPaths.ts`. Use a named export and an optional `className` for size.
3. Decide the reduced-motion behaviour (section 5) and implement it in the same component.
4. Check it against the performance rules (section 6): loops on the `<svg>` box, no transitions on continuously changing values.
5. Keep any math in a `*.utils.ts` file with a Vitest test next to it.
6. Use semantic colour classes and check light mode, dark mode, RTL and LTR.
7. Update the tables in this guide.

## 9. Still Open

Ideas from the motion lab that are not built. Numbers refer to the motion-lab ideas.

| # | Idea | Status |
| --- | --- | --- |
| 38 | Letters reel into the 0 as the page scrolls | Wanted for the landing page; placement not decided. The landing has no horizontal header: on `2xl` screens a side glass nav shows the wide logo, below that only a round menu button. |
| 14 | Pull to refresh with the symbol | Under consideration. Touch devices only (mobile web, installed PWA, Android TWA). |
| 34 | App-icon launch | Only the colour fix is built (see the pre-loader row). The animated version is not planned: installed app only, and the OS splash itself cannot be animated. |

Not chosen: 19 (favicon progress), 10א / 10ב (coin / check morph), 18 (celebration), 12 (sync-error state), 21 / 22 (hero wordmark), 27, 5, 13.
