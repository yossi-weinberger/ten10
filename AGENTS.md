# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Ten10 is a Hebrew-first financial management platform for tracking income, expenses, and Jewish religious tithes (Ma'aserot). It has two deployment targets:
- **Web app** (React + Vite + Supabase) — primary development target
- **Desktop app** (Tauri v2 + SQLite + Rust) — requires Rust toolchain

Standard dev commands are documented in `README.md` and `package.json` scripts.

### Environment variables

The web app requires a `.env` file at the repo root with:

```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

Without these, the React app will fail to initialize (`supabaseClient.ts` throws at module load time), and the browser will show only the static HTML pre-loader indefinitely. The Supabase project ref is `flpzqbvbymoluoeeeofg`.

### Running the web frontend

```bash
npm run dev     # Vite dev server at http://localhost:5173
npm run lint    # ESLint (note: repo has ~246 pre-existing lint warnings/errors)
npm run build   # Production build (use CI=true to exclude Tauri modules)
```

### Key gotchas

- The `index.html` contains a static pre-loader that is only replaced once React mounts. If module initialization fails (e.g., missing env vars), the loading spinner stays on screen with no visible error — check the browser console for the actual error.
- The landing page (`/landing`) and login/signup pages are public routes. Authenticated routes (dashboard, transactions, settings) require a valid Supabase session.
- ESLint config is in `eslint.config.js` (flat config format). The `supabase/functions/` directory uses Deno-style imports and will show lint issues — this is expected.
- For desktop (Tauri) development, Rust and system dependencies (webkit2gtk, etc.) are required. See Tauri v2 prerequisites.
- On first login/signup, the app shows a Terms acceptance modal followed by a "What's New" modal. Both must be dismissed before the dashboard is usable.
- These secrets must be injected as environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. The update script writes them to `.env` automatically when present.
