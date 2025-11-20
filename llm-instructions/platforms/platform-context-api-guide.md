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

## מתי להשתמש ב-PlatformContext לעומת פקודות Tauri?

חשוב להבין את ההבדל בין שני המנגנונים לזיהוי הפלטפורמה:

### 1. `PlatformContext` (ה-Hook `usePlatform`)

- **מטרה:** זיהוי רחב ומהיר של סביבת הריצה (`'web'` או `'desktop'`).
- **אופן שימוש:** בעיקר עבור **תצוגה מותנית** בקומפוננטות React. הוא מאפשר להציג או להסתיר רכיבי UI שונים בהתבסס על הסביבה. לדוגמה, להציג כפתור "התחברות" רק בגרסת ה-Web.
- **יתרון:** הזיהוי הוא סינכרוני (לאחר טעינה ראשונית) וזמין באופן גלובלי בכל רכיב, מה שהופך אותו לאידיאלי להחלטות UI פשוטות ומהירות.
- **מגבלה:** הוא רק עונה על השאלה _האם_ אנחנו בדסקטופ, אך לא מספק פרטים _איזה_ דסקטופ (גרסה, מערכת הפעלה וכו').

### 2. פקודות Tauri ייעודיות (למשל `invoke('get_platform_info')`)

- **מטרה:** קבלת **מידע טכני מפורט** שזמין רק בסביבת דסקטופ.
- **אופן שימוש:** יש לקרוא לפקודות אלו _רק לאחר_ שווידאנו באמצעות `usePlatform` שאנחנו אכן בסביבת `'desktop'`. השימוש המרכזי הוא לאיסוף מידע לצורך אבחון תקלות (diagnostics), לוגים, או מילוי מראש של נתונים טכניים (כמו בפיצ'ר "צור קשר").
- **יתרון:** מאפשר גישה מאובטחת ל-API של מערכת ההפעלה דרך ה-Backend של Tauri (Rust), מבלי לחשוף את ה-API הזה לקוד ה-Frontend שרץ בדפדפן.
- **מגבלה:** הפעולה היא אסינכרונית ורלוונטית רק לדסקטופ.

### סיכום זרימת עבודה נכונה:

```typescript
import { usePlatform } from "@/contexts/PlatformContext";
import { invoke } from "@tauri-apps/api/core";

function MyDesktopFeature() {
  const { platform } = usePlatform();

  const handleGetData = async () => {
    // 1. First, check the general platform
    if (platform === "desktop") {
      // 2. Only then, invoke the specific command to get details
      try {
        const details = await invoke("get_platform_info");
        console.log(details); // { appVersion: '1.0.0', osPlatform: 'windows' }
      } catch (e) {
        console.error("Failed to get platform info", e);
      }
    }
  };

  // Render button only on desktop
  return platform === "desktop" ? (
    <button onClick={handleGetData}>Get Desktop Info</button>
  ) : null;
}
```

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
