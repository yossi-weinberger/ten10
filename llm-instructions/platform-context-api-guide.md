# גישת Context API לזיהוי פלטפורמה (Web/Desktop) בזמן ריצה

**מטרה:** לזהות באופן מרכזי אם אפליקציית ה-React רצה בדפדפן רגיל (Web) או בתוך מסגרת Desktop (כמו Tauri או Electron), ולספק מידע זה בצורה נוחה לכל הקומפוננטות.

**רעיון מרכזי:** שימוש ב-React Context כדי להחזיק את מצב הפלטפורמה (`'web'`, `'desktop'`, או `'loading'`) ולספק אותו לכל עץ הקומפוננטות באמצעות Provider ו-Hook ייעודי.

---

## שלב 1: יצירת ה-Context

**מטרה:** להגדיר את המבנה והערך ההתחלתי של ה-Context.

- ניצור Context שיחזיק אובייקט עם שדה `platform`.
- נגדיר טיפוסים (Types) עבור ערכי הפלטפורמה האפשריים ועבור מבנה ה-Context.

**קוד (`src/contexts/PlatformContext.tsx`):**

```typescript
// src/contexts/PlatformContext.tsx
import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";

// NOTE: We do not statically import from '@tauri-apps/plugin-os'.
// This is crucial to prevent build failures on web-only environments like Vercel,
// which cannot resolve Tauri-specific plugins during the build process.

// 1. Define possible platform states
export type Platform = "web" | "desktop" | "loading";

// 2. Define the shape of the context value
export interface PlatformContextType {
  platform: Platform;
}

// 3. Create the context with an initial undefined value
// This helps the hook ensure it's used inside a provider.
const PlatformContext = createContext<PlatformContextType | undefined>(
  undefined
);

interface PlatformProviderProps {
  children: ReactNode;
}

// 4. Create the Provider component
export const PlatformProvider: React.FC<PlatformProviderProps> = ({
  children,
}) => {
  const [platform, setPlatform] = useState<Platform>("loading");

  useEffect(() => {
    const detectPlatform = async () => {
      // This is the most reliable method to detect if the app is running in a
      // Tauri environment without breaking web builds. The `__TAURI_INTERNALS__`
      // global is injected by Tauri's webview, so its presence is a definitive sign.
      // @ts-expect-error -- this is a Tauri-specific global and is not typed
      if (window.__TAURI_INTERNALS__) {
        try {
          // Dynamically import the plugin ONLY when we are sure we're in Tauri.
          // Vite/Rollup will code-split this import, creating a separate chunk
          // that is only loaded on demand, thus keeping it out of the main web bundle.
          const osPlugin = await import("@tauri-apps/plugin-os");
          await osPlugin.platform(); // A simple call to ensure the plugin loaded correctly.
          setPlatform("desktop");
        } catch (e) {
          console.error(
            "Tauri environment detected, but OS plugin failed to load:",
            e
          );
          // As a safety fallback, assume web if the plugin fails.
          setPlatform("web");
        }
      } else {
        // If the global does not exist, we are definitely on a standard web platform.
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

// 5. Create the custom hook for consuming the context
export const usePlatform = (): PlatformContextType => {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    // Ensure the hook is used within the provider tree
    throw new Error("usePlatform must be used within a PlatformProvider");
  }
  return context;
};
```

---

## שלב 2: עטיפת האפליקציה

**מטרה:** לגרום ל-Provider להיות זמין לכל הקומפוננטות באפליקציה.

- בקובץ הכניסה הראשי של האפליקציה (לרוב `src/main.tsx` או `src/index.tsx` או `src/App.tsx`), ייבא את `PlatformProvider`.
- עטוף את רכיב האפליקציה הראשי (`<App />` או דומה) בתוך `<PlatformProvider>`.

**קוד (דוגמה ב-`src/main.tsx`):**

```typescript
// src/main.tsx (example)
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { PlatformProvider } from "./contexts/PlatformContext"; // Import the provider
import "./index.css";
import { ThemeProvider } from "./lib/theme";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Wrap the entire App with the provider */}
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

---

## שלב 3: שימוש ב-Hook בקומפוננטות

**מטרה:** לגשת למידע הפלטפורמה בתוך כל קומפוננטה שצריכה אותו.

- ייבא את ה-Hook: `import { usePlatform } from '@/contexts/PlatformContext';`.
- קרא ל-Hook בתוך הקומפוננטה: `const { platform } = usePlatform();`.
- השתמש במשתנה `platform` כדי לבצע תצוגה מותנית, להחיל קלאסים, או לבצע לוגיקה אחרת.
- (אופציונלי) ניתן לטפל במצב `'loading'` הראשוני אם יש צורך.

**קוד (דוגמה בקומפוננטה):**

```typescript
import React from "react";
import { usePlatform } from "@/contexts/PlatformContext";
import DesktopOnlyFeature from "./DesktopOnlyFeature"; // Example component
import WebOnlyFeature from "./WebOnlyFeature"; // Example component

function MyComponent() {
  const { platform } = usePlatform(); // Get platform status

  if (platform === "loading") {
    return <div>Loading platform info...</div>; // Handle loading state
  }

  return (
    <div>
      <h1>Welcome!</h1>
      <p>This part is visible on both platforms.</p>

      {/* Show component only on Desktop */}
      {platform === "desktop" && <DesktopOnlyFeature />}

      {/* Show component only on Web */}
      {platform === "web" && <WebOnlyFeature />}

      {/* Apply different styles */}
      <div className={platform === "desktop" ? "desktop-styles" : "web-styles"}>
        Styled differently based on platform.
      </div>
    </div>
  );
}

export default MyComponent;
```

---

**סיכום יתרונות גישה זו:**

- **לוגיקה מרוכזת:** זיהוי הפלטפורמה נעשה במקום אחד (`PlatformProvider`).
- **קלות שימוש:** ה-Hook `usePlatform` מספק גישה פשוטה למידע.
- **גמישות:** ניתן להשתמש במידע הפלטפורמה לכל צורך (תצוגה, עיצוב, לוגיקה).
- **שינוי קל:** אם אופן הזיהוי משתנה, צריך לעדכן רק את ה-Provider.

## הערות נוספות

- **טעינת נתונים תלויית פלטפורמה:** קומפוננטות או contexts אחרים (כמו `AuthContext` שמנהל אימות וטעינת נתונים תלויי-משתמש) יכולים להשתמש ב-`usePlatform()` כדי לקבוע איזה שירות נתונים להפעיל (למשל, גישה ל-SQLite דרך Tauri עבור `desktop`, או גישה ל-Supabase עבור `web`). טעינת הנתונים עצמה תופעל בדרך כלל לאחר שהפלטפורמה זוהתה (כלומר, הערך אינו `'loading'`) ולאחר שתנאים נוספים (כמו זיהוי משתמש מאומת) התקיימו.
- **אופטימיזציה:** עבור אפליקציות גדולות מאוד, ניתן לשקול אופטימיזציות כמו `React.memo` בקומפוננטות שצורכות את ה-context אם יש חשש מרינדורים מיותרים עקב שינויים ב-context (למרות שבמקרה זה, ערך ה-`platform` צפוי להשתנות רק פעם אחת מטעינה לערך הסופי).

## תצורת בנייה (Build Configuration) קריטית עבור Tauri

כאשר משתמשים ב-Vite לבניית אפליקציית React עבור Tauri, ישנה הגדרה קריטית בקובץ `vite.config.ts` שחובה להכיר.

**הבעיה:** בברירת המחדל, `vite build` מייצר קובץ `index.html` עם נתיבים אבסולוטיים לקבצי ה-JavaScript וה-CSS (למשל, `/assets/index.js`). נתיבים אלו עובדים נכון בסביבת שרת ווב רגיל, אך נכשלים באפליקציית Tauri מכיוון שהיא טוענת את ה-HTML ישירות ממערכת הקבצים, ושם נתיב אבסולוטי כזה אינו תקין.

**התסמין:** האפליקציה נטענת עם מסך לבן, ובקונסולת המפתחים (אם זמינה) תופיע שגיאה מסוג `Uncaught SyntaxError: Unexpected token '<'`, המצביעה על כך שבמקום קובץ JS, נטען קובץ ה-HTML הראשי.

**הפתרון:** יש להורות ל-Vite לייצר נתיבים יחסיים. עושים זאת על ידי הוספת התכונה `base: "./"` לאובייקט הקונפיגורציה ב-`vite.config.ts`.

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // >> ADD THIS LINE FOR TAURI BUILDS <<
  base: "./",
  // >> END OF ADDED LINE <<
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

הגדרה זו מבטיחה שהנתיבים ב-`index.html` יהיו יחסיים (למשל, `./assets/index.js`), מה שמאפשר לאפליקציית ה-Tauri למצוא ולטעון אותם כראוי.

---

## היסטוריית פיתוח וניפוי באגים

מדריך זה מתאר את הפתרון הנכון והנוכחי. עם זאת, תהליך ההגעה לפתרון זה כלל מספר שלבי איתור באגים חשובים.
תיעוד מפורט של התהליך, כולל ניסיונות שנכשלו וניתוח שורש הבעיה, נמצא במסמך [סיכום איתור באגים של Tauri v2](./tauri-v2-build-and-platform-detection-summary.md). מומלץ לעיין בו כדי להבין את ההקשר המלא, במיוחד אם נתקלים בבעיות בנייה (build) דומות בעתיד.
