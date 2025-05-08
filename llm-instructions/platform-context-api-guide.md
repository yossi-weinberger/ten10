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
  useState,
  useEffect,
  ReactNode,
} from "react";

// 1. Define possible platform states
export type Platform = "web" | "desktop" | "loading";

// 2. Define the shape of the context value
export interface PlatformContextType {
  platform: Platform;
}

// 3. Create the context with a default value ('loading' initially)
export const PlatformContext = createContext<PlatformContextType>({
  platform: "loading",
});

// --- Provider and Hook will be added below ---
```

---

## שלב 2: יצירת ה-Provider

**מטרה:** הרכיב שיבצע את זיהוי הפלטפורמה ויספק את הערך ל-Context.

- ישתמש ב-`useState` כדי להחזיק את ערך הפלטפורמה הנוכחי.
- ישתמש ב-`useEffect` (שירוץ פעם אחת בטעינה) כדי לבדוק את סביבת הריצה.
  - **עבור Tauri:** בדוק `window.__TAURI__`.
  - **עבור Electron:** בדוק `window.electron?.isElectron` (או מה שהוגדר ב-preload).
- יעדכן את ה-state עם הפלטפורמה שזוהתה (`'desktop'` או `'web'`).
- יעטוף את ה-`children` שלו עם `PlatformContext.Provider` ויספק את ערך ה-state העדכני.

**קוד (`src/contexts/PlatformContext.tsx` - המשך):**

```typescript
// ... (imports and context creation from Step 1) ...

interface PlatformProviderProps {
  children: ReactNode;
}

// 4. Create the Provider component
export const PlatformProvider: React.FC<PlatformProviderProps> = ({
  children,
}) => {
  const [platform, setPlatform] = useState<Platform>("loading");

  useEffect(() => {
    // --- Detection Logic ---
    // Adjust the condition based on your desktop framework (Tauri/Electron)
    const isDesktop = Boolean(
      (window as any).__TAURI__ || // Check for Tauri
        (window as any).electron?.isElectron // Check for Electron (example)
    );

    setPlatform(isDesktop ? "desktop" : "web");
    // --- End Detection Logic ---

    // Run this effect only once on component mount
  }, []);

  return (
    <PlatformContext.Provider value={{ platform }}>
      {children}
    </PlatformContext.Provider>
  );
};

// --- Hook will be added below ---
```

---

## שלב 3: יצירת ה-Hook הייעודי

**מטרה:** לספק דרך נוחה וקצרה לקומפוננטות "לצרוך" את ערך ה-Context.

- פונקציה (`usePlatform`) שמשתמשת ב-`useContext` כדי לקבל את הערך מ-`PlatformContext`.
- כוללת בדיקה לוודא שה-Hook נקרא בתוך עץ קומפוננטות שעטוף ב-`PlatformProvider`.

**קוד (`src/contexts/PlatformContext.tsx` - סיום):**

```typescript
// ... (imports, context creation, and Provider from Steps 1 & 2) ...

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

**הקובץ המלא `src/contexts/PlatformContext.tsx` יראה כך:**

```typescript
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type Platform = "web" | "desktop" | "loading";

export interface PlatformContextType {
  platform: Platform;
}

export const PlatformContext = createContext<PlatformContextType>({
  platform: "loading",
});

interface PlatformProviderProps {
  children: ReactNode;
}

export const PlatformProvider: React.FC<PlatformProviderProps> = ({
  children,
}) => {
  const [platform, setPlatform] = useState<Platform>("loading");

  useEffect(() => {
    const isDesktop = Boolean(
      (window as any).__TAURI__ || (window as any).electron?.isElectron
    );
    setPlatform(isDesktop ? "desktop" : "web");
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

---

## שלב 4: עטיפת האפליקציה

**מטרה:** לגרום ל-Provider להיות זמין לכל הקומפוננטות באפליקציה.

- בקובץ הכניסה הראשי של האפליקציה (לרוב `src/main.tsx` או `src/index.tsx` או `src/App.tsx`), ייבא את `PlatformProvider`.
- עטוף את רכיב האפליקציה הראשי (`<App />` או דומה) בתוך `<PlatformProvider>`.

**קוד (דוגמה ב-`src/main.tsx`):**

```typescript
// src/main.tsx (example)
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PlatformProvider } from "./contexts/PlatformContext"; // Import the provider
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Wrap the entire App with the provider */}
    <PlatformProvider>
      <App />
    </PlatformProvider>
  </React.StrictMode>
);
```

---

## שלב 5: שימוש ב-Hook בקומפוננטות

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

- **טעינת נתונים תלויית פלטפורמה:** קומפוננטות או contexts אחרים (כמו `AuthContext` שמנהל אימות וטעינת נתונים תלויי-משתמש) יכולים להשתמש ב-`usePlatform()` כדי לקבוע איזה `dataService` להפעיל (למשל, גישה ל-SQLite דרך Tauri עבור `desktop`, או גישה ל-Supabase עבור `web`). טעינת הנתונים עצמה תופעל בדרך כלל לאחר שהפלטפורמה זוהתה (כלומר, הערך אינו `'loading'`) ולאחר שתנאים נוספים (כמו זיהוי משתמש מאומת) התקיימו.
- **אופטימיזציה:** עבור אפליקציות גדולות מאוד, ניתן לשקול אופטימיזציות כמו `React.memo` בקומפוננטות שצורכות את ה-context אם יש חשש מרינדורים מיותרים עקב שינויים ב-context (למרות שבמקרה זה, ערך ה-`platform` צפוי להשתנות רק פעם אחת מטעינה לערך הסופי).
