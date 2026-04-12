# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Ten10 is a financial management platform (income, expenses, tithes/Ma'aserot) with two targets:
- **Web app**: React SPA + Supabase backend (the primary dev workflow)
- **Desktop app**: Same React frontend wrapped in Tauri + SQLite (optional, requires Rust)

### Environment variables

The web app requires two Vite env vars provided via `.env` at project root:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These are injected as Cursor Cloud secrets. The `.env` file must be created before running the dev server:
```
echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" > .env
echo "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" >> .env
```

### Node version

The project requires Node.js 24.x (`engines` field in `package.json`). Use nvm:
```
source ~/.nvm/nvm.sh && nvm use 24
```

### Common commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (Vite on http://localhost:5173) |
| Lint | `npm run lint` (ESLint, has ~250 pre-existing warnings/errors) |
| Build | `npm run build` (Vite production build) |
| Preview prod build | `npm run preview` |
| Tauri desktop dev | `npm run tauri dev` (requires Rust) |

### Gotchas

- There is no `.env.example` in the repo. If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing, the app throws on import.
- ESLint reports ~250 pre-existing issues (mostly `no-unused-vars` and `no-explicit-any`). These are not regressions.
- The `package.json` `engines` field requires Node 24.x. npm will warn if a different major version is used.
- Tauri desktop development requires Rust and system WebView libraries; it is optional for frontend-only work.
- The project uses `package-lock.json` → use `npm` (not pnpm/yarn).
