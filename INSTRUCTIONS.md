# Instructions: Platform-Specific Components (Web/Desktop)

## Goal

Enable the creation of distinct components for the Web (browser) environment and the Desktop (Tauri) environment, in addition to shared components.

## How It Works

1.  **File Naming Convention:**

    - `[ComponentName].web.tsx`: Web-specific version.
    - `[ComponentName].desktop.tsx`: Desktop (Tauri)-specific version.
    - `[ComponentName].tsx`: Shared/Default version (Fallback).
    - **Important:** All variant files for a single component must reside in the same directory (e.g., `src/components/MyButton/`).

2.  **Preparation Script (`scripts/prepare-components.js`):**

    - **When it runs:** Automatically _before_ every development (`dev`, `dev:desktop`) or build (`build`, `build:desktop`) command, as defined in `package.json`.
    - **What it does:** Accepts a `--target=web` or `--target=desktop` parameter. It scans the `src/components` directory (ignoring the `ui` directory). For each component directory containing `.tsx` files, it creates/updates an `index.ts` file.
    - **`index.ts` Logic:** The generated file re-exports the component from the appropriate file based on the target, in the following order:
      - If `target=web`: Looks for `.web.tsx`, if not found, looks for `.tsx`.
      - If `target=desktop`: Looks for `.desktop.tsx`, if not found, looks for `.tsx`.
    - **File Management:** These `index.ts` files are auto-generated and included in `.gitignore`. **Do not edit them manually.**

3.  **Using Components:**

    - Always import the component from its directory path, for example:
      ```typescript
      import MyButton from "@/components/MyButton";
      ```
    - The alias system and the generated `index.ts` will ensure the correct version is loaded.

4.  **Core Commands (`package.json`):**

    - Commands are divided into "preparation" steps (`prepare:web`, `prepare:desktop`) and "clean" run/build steps (`dev:vite`, `build:vite`).
    - The main commands (`dev`, `build`, `dev:desktop`, `build:desktop`) first run the appropriate preparation script and then the clean Vite or Tauri command.

5.  **Tauri Configuration (`tauri.conf.json`):**
    - The `beforeDevCommand` and `beforeBuildCommand` are configured to run the "clean" Vite commands (`npm run dev:vite`, `npm run build:vite`) to prevent overwriting the preparation step.

## Workflow

- When creating a new component needing different versions, create the corresponding files (`.web.tsx`, `.desktop.tsx`, `.tsx`) in the same directory. The script will detect it on the next run.
- To add a specific version to an existing component, simply create the additional file (`.web.tsx` or `.desktop.tsx`).
