# גישת Context API לזיהוי פלטפורמה (Web/Desktop) בזמן ריצה

**מטרה:** זיהוי מרכזי אם האפליקציה רצה ב-Web או Desktop (Tauri/Electron), וסיפוק המידע לכל הקומפוננטות.

**רעיון מרכזי:** שימוש ב-React Context להחזקת מצב הפלטפורמה ('web', 'desktop', 'loading') באמצעות Provider ו-Hook.

## שלב 1: יצירת ה-Context (`src/contexts/PlatformContext.tsx`)

```typescript
// src/contexts/PlatformContext.tsx
import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";

// NOTE: No static import of '@tauri-apps/plugin-os' to avoid build failures on web.

export type Platform = "web" | "desktop" | "loading";

export interface PlatformContextType {
  platform: Platform;
}

const PlatformContext = createContext<PlatformContextType | undefined>(
  undefined
);

interface PlatformProviderProps {
  children: ReactNode;
}

export const PlatformProvider: React.FC<PlatformProviderProps> = ({
  children,
}) => {
  const [platform, setPlatform] = useState<Platform>("loading");

  useEffect(() => {
    const detectPlatform = async () => {
      // @ts-expect-error -- Tauri-specific global
      if (window.__TAURI_INTERNALS__) {
        try {
          const osPlugin = await import("@tauri-apps/plugin-os");
          await osPlugin.platform();
          setPlatform("desktop");
        } catch (e) {
          console.error("Tauri detected, but OS plugin failed:", e);
          setPlatform("web");
        }
      } else {
        setPlatform("web");
      }
    };

    detectPlatform();
  }, []);

  return (
    <PlatformContext.Provider value={{ platform }}>
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = (): PlatformContextType => {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error("usePlatform must be used within a PlatformProvider");
  }
  return context;
};
```

## שלב 2: עטיפת האפליקציה (`src/main.tsx`)

```typescript
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { PlatformProvider } from "./contexts/PlatformContext";
import "./index.css";
import { ThemeProvider } from "./lib/theme";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PlatformProvider>
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </PlatformProvider>
  </React.StrictMode>
);
```

## שלב 3: שימוש ב-Hook בקומפוננטות

```typescript
import { usePlatform } from "@/contexts/PlatformContext";

function MyComponent() {
  const { platform } = usePlatform();

  if (platform === "loading") return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome!</h1>
      {platform === "desktop" && <DesktopOnlyFeature />}
      {platform === "web" && <WebOnlyFeature />}
      <div className={platform === "desktop" ? "desktop-styles" : "web-styles"}>
        Platform-specific styling.
      </div>
    </div>
  );
}
```

**יתרונות:** לוגיקה מרוכזת, גישה פשוטה, גמישות, שינוי קל.

## הערות נוספות

- **טעינת נתונים:** השתמש ב-`usePlatform` כדי לבחור שירות נתונים (SQLite ב-Desktop, Supabase ב-Web) לאחר זיהוי פלטפורמה ומשתמש.
- **אופטימיזציה:** השתמש ב-`React.memo` אם נדרש.

## תצורת בנייה עבור Tauri (`vite.config.ts`)

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "./", // For relative paths in Tauri
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**בעיה ופתרון:** נתיבים אבסולוטיים גורמים למסך לבן ב-Tauri; `base: "./"` מייצר נתיבים יחסיים.

## היסטוריית פיתוח

ראה [tauri-v2-build-and-platform-detection-summary.md] לפרטי איתור באגים.
