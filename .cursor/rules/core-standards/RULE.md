---
description: "Core project standards, tech stack, and architecture guidelines. Apply to all changes."
alwaysApply: true
---

# Core Project Standards

## 1. Tech Stack

- **Language:** TypeScript (`.ts`, `.tsx`) only. No JavaScript.
- **Frontend:** React 18+ (Functional Components + Hooks), Vite.
- **Desktop:** Tauri v2 (Rust backend in `src-tauri`).
- **UI:** Tailwind CSS + shadcn/ui.
- **State:** Zustand (Global), React Hook Form (Forms), TanStack Router (Routing).
- **Backend/DB:**
  - **Web:** Supabase (PostgreSQL).
  - **Desktop:** SQLite (local).

## 2. Directory Structure & Naming

- **Components:** `src/components/[Feature]/[Component].tsx` (PascalCase).
- **Pages:** `src/pages/[PageName].tsx` (PascalCase).
- **Hooks:** `src/hooks/use[HookName].ts` (camelCase).
- **Services:** `src/lib/data-layer/[service].service.ts` (camelCase).
- **Rust:** `src-tauri/src/commands/[module].rs` (snake_case).

## 3. Data Layer Architecture (CRITICAL)

- **Separation of Concerns:** UI components **MUST NOT** directly call `supabase` SDK or Tauri `invoke`.
- **Service Layer:** ALL data fetching and mutations must go through `src/lib/data-layer`.
- **Platform Agnostic:** Services in `data-layer` must handle platform detection (`isPlatform.web` / `isPlatform.desktop`) internally or via `platformManager.ts`.

## 4. Coding Conventions

- **Exports:** Use named exports (`export const MyComponent...`) instead of default exports.
- **Types:** Define shared types in `src/types/` or co-located if specific to a component.
- **Async:** Use `async/await` over `.then()`.
- **Imports:** Use absolute imports `@/` where configured.

## 5. Platform Specifics

- Check platform using `PlatformContext` or `isPlatform` helper.
- **Web:** Hosted on Vercel. Auth via Supabase Auth.
- **Desktop:** Offline-first. No auth required. Updates via Tauri/GitHub Releases.
