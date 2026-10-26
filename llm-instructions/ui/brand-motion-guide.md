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
| Static pre-loader symbol (runs before JavaScript) | `public/logo/symbol-loader.svg`, sized in `public/loader.css` |
| Plain, non-animated logo files | `public/logo/*.svg` (unchanged) |

Do not put keyframes in component files, inline `<style>` tags or new CSS files. Add them to the `brand-*` group in `tailwind.config.js` and apply them with Tailwind classes. The only exception is `public/logo/symbol-loader.svg`, which has to animate inside an `<img>` before the app's CSS exists.

## 2. Components

| # | Component | What it does | Used in |
| --- | --- | --- | --- |
| 1 | `BrandSpinner` | Indeterminate loader: the symbol spins with an ease-in-out rhythm and the slice is flung outward at peak speed. | `AppLoader`, `ImportWizard` loading state, `FileUploadStep` (dropzone and sheet confirm button) |
| 1 | `public/logo/symbol-loader.svg` | Same motion as `BrandSpinner`, self-contained for the static pre-loader. | `index.html` (`#pre-loader`) |
| 6 | `BrandProgress` | Determinate progress: the ring fills to 90% and the slice drops in for the last 10%. Split logic in `brandProgress.utils.ts`. | `AppLoader` when it receives `progress` (Settings data import) |
| 7 | `BrandDone` | One-shot success: the last half-turn settles, the slice clicks in, a ripple leaves the ring and a check is drawn inside the 0. | `ImportResultStep` when rows were inserted |
| 12ב | `Brand404` | "404" where the 0 is the symbol; it shakes "no", the slice falls to the floor and rocks to rest. Plays once. | `NotFoundPage` |
| 38ב | `BrandSidebarLogo` | Sidebar logo that morphs letter by letter between the wide logo (expanded) and the square logo (collapsed); the 0 turns once. Positions come from `sidebarLogoLayout.utils.ts`. | `Sidebar` |
| 20 | `BrandHandoffSymbol` (via `AppLoader exiting`) | First-load handoff: when the app shell appears, the loader's symbol flies into the 0 of the sidebar logo while the loader fades away. Constants and the flight maths are in `brandHandoff.utils.ts`. | `App.tsx` |

All components are decorative (`aria-hidden="true"`). The surrounding UI must carry the meaning in text (`role="status"` messages, headings, counts).

## 3. Sidebar Logo and First-Load Handoff

**Sidebar morph (38ב).** Both logo files draw the same letters (`logo.svg` draws "TEN" at 56% and "10" at full size), so `BrandSidebarLogo` draws every glyph once from its `logo-wide.svg` path and moves it with a CSS `transform` per state. `getSidebarLogoLayout(dir)` turns the sidebar's real measurements (`w-44` / `w-16`, a 36px row, `h-7` wide logo behind `px-4`, an `h-9 w-9` square logo centred in the rail) into those transforms for RTL and LTR. Rules:

- Transitions use `duration-300`, the same as the sidebar's width (`ui-component-guidelines.md` §10.1). Do not stagger or lengthen them.
- The SVG is as wide as the expanded sidebar and pinned to the inline-start edge of a `relative`, `overflow-hidden` row, so the collapsing rail clips it.
- If the sidebar's measurements change, update `SIDEBAR_LOGO_ROW` and its tests.

**First-load handoff (20).** `App.tsx` decides once, the first time the app shell renders, whether the handoff can run: only when the desktop sidebar is visible (`md` and up, not a full-screen page) and not after the desktop lock screen. It then renders `<AppLoader exiting onExited={…} />` on top of the shell. That overlay ignores pointer events, fades its background and text, and `BrandHandoffSymbol` flies to the element marked `data-brand-zero` (a ring-sized circle in `BrandSidebarLogo`). While it runs, `<html>` carries `data-brand-handoff`, which hides the sidebar's own 0 (`[[data-brand-handoff]_&]:opacity-0`) so the two never overlap. With reduced motion, or without a target, the loader fades out instead.

## 4. Geometry and Colours

- Paths in `logoPaths.ts` put the ring's centre at `(0, 0)`. Rotations and scales about the symbol use `origin-[0_0]` (SVG's default `transform-box: view-box`).
- A part that rotates around its own centre (e.g. the falling slice) uses `[transform-box:fill-box] origin-center`.
- `SYMBOL_VIEWBOX` is tight around the symbol at rest. Components set `overflow-visible` so motion can leave the box without changing the component's size. Existing size classes (`h-14 w-14`, …) keep the same visual size as the old `<img src="/logo/symbol.svg">`.
- Colours come from theme tokens: ring `fill-primary`, slice `fill-accent`, strokes `stroke-primary`. In dark mode the ring automatically uses the lighter teal. Do not hardcode `#11676a` / `#f0c000` in components.
- Exception: `symbol-loader.svg` uses the hex brand colours because it renders before the theme exists.
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
3. `symbol-loader.svg` handles this with `@media (prefers-reduced-motion: reduce)` inside the file.

This matches the rest of the app, which already uses `motion-safe:` utilities and `useReducedMotion` (landing page, `PrepareStep`).

## 6. Accessibility Timing (WCAG 2.2.2)

Israeli accessibility regulations follow WCAG at level AA. Success criterion 2.2.2 (Pause, Stop, Hide) requires a way to stop anything that moves on its own for more than 5 seconds next to other content. Loading indicators are exempt.

- Loaders may loop while the thing they represent is loading.
- Everything else plays once (`1` iteration) or only in response to the user (hover, scroll, drag). Do not add ambient loops.

## 7. Adding a Brand Animation

1. Add keyframes and an `animate-brand-*` utility to the `brand-*` group in `tailwind.config.js`. Keep durations, delays and fill modes in the utility so components only reference class names.
2. Build the component in `src/components/brand/` from `logoPaths.ts`. Use a named export and an optional `className` for size.
3. Decide the reduced-motion behaviour (section 5) and implement it in the same component.
4. Keep any math in a `*.utils.ts` file with a Vitest test next to it.
5. Use semantic colour classes and check light mode, dark mode, RTL and LTR.
6. Update the tables in this guide.

## 8. Planned (Chosen in the Motion Lab, Not Built Yet)

Letters refer to places in the app; numbers to the motion-lab ideas.

| # | Idea | Intended place |
| --- | --- | --- |
| 38 | Letters reel into the 0 as the page scrolls | Landing page floating navigation |
| 19 | Favicon fills with import/export progress | Web version, import/export |
| 10א / 10ב | Slice morphs into a coin or a check mark | Transaction saved, confirmations |
| 18 | Burst of mini slices | Yearly tithe goal reached |
| 12 | Slice falls off and returns | Sync error / offline |
| 15 | The 0 fills with reading progress | Halacha page |
| 21 / 22 | Wordmark roll-in / typewriter | Landing hero (`AnimatedLogo`) |
| 27 | Letters unfold from the 0 (alternative to #20, not chosen for now) | — |
| 5, 13, 14, 34 | Write-on, cursor compass, pull to refresh, app-icon launch | Not placed yet |
