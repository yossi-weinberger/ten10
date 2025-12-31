---
description: "Guidelines for business logic, platform separation (Web/Desktop), and data handling."
alwaysApply: true
---

# Logic & Platform Standards

## 1. Platform Isolation

- **Context:** Use `PlatformContext` (`usePlatform`) to detect environment (`web` | `desktop`).
- **Feature Flags:**
  - **Auth:** Web Only. Desktop has no auth.
  - **Updater:** Desktop Only (`@tauri-apps/plugin-updater`).
  - **Notifications:** Platform specific implementations in `src/lib/data-layer`.

## 2. Data Layer (`src/lib/data-layer`)

- **Single Source of Truth:** All data access goes through this layer.
- **Service Pattern:**
  - Create standard services (e.g., `transactions.service.ts`).
  - Internally handle the split:
    ```ts
    if (isPlatform.desktop) {
      return await invoke("get_transactions"); // Tauri/Rust
    } else {
      return await supabase.rpc("get_transactions"); // Web/Supabase
    }
    ```
- **Store (Zustand):** Use stores for client-side state, but sync back to DB via services.

## 3. Server-Side Calculations

- **Priority:** Prefer server-side calculations (Rust for Desktop, Postgres RPC for Web) for heavy aggregations (e.g., Tithe Balance, Total Income).
- **Client Fallback:** Avoid complex client-side math if the server can provide it efficiently.

## 4. Database Schema

- **Unified Model:** Both SQLite (Desktop) and Supabase (Web) use the same `transactions` table structure.
- **Naming:** Use `snake_case` for DB columns and `camelCase` for TS properties (mapped in the service layer if needed, or consistent `snake_case` in types if preferred by project).

## 5. Async Operations

- **Error Handling:** Always wrap async calls in `try/catch`.
- **Loading States:** Use explicitly defined loading states in UI to prevent layout shift.
