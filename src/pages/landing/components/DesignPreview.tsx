import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Download, Globe, Star, Award, Shield } from "lucide-react";

// 1. Text Roll Button Component
const TextRollButton = ({
  children,
  variant = "primary",
  icon,
  onClick,
}: {
  children: string;
  variant?: "primary" | "dark" | "outline";
  icon?: React.ReactNode;
  onClick?: () => void;
}) => {
  const baseClasses =
    "group relative inline-flex items-center gap-2 rounded-full font-medium transition-all duration-300";

  const variants = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 pl-5 pr-2 py-2",
    dark: "bg-gray-900 text-white hover:bg-gray-800 pl-5 pr-2 py-2",
    outline:
      "border border-border bg-background text-foreground hover:bg-muted pl-5 pr-5 py-2",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]}`}
    >
      <span className="relative h-5 overflow-hidden">
        <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
          <span className="text-sm">{children}</span>
          <span className="text-sm">{children}</span>
        </span>
      </span>
      {icon && (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-primary transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:rotate-[-45deg]">
          {icon}
        </span>
      )}
    </button>
  );
};

// 2. Pill Navbar Component
const PillNavbar = () => {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jerusalem",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="rounded-full bg-white/90 p-1.5 shadow-lg backdrop-blur-xl border border-border/50">
      <div className="flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <span className="text-xs font-bold">T10</span>
        </div>

        {/* Nav Links */}
        <div className="hidden items-center gap-6 md:flex">
          {["תכונות", "אודות", "שאלות", "הורדה"].map((item) => (
            <button
              key={item}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
            <Clock className="h-3.5 w-3.5" />
            <span>{time} בישראל</span>
          </div>
          <TextRollButton variant="dark" icon={<ArrowRight className="h-4 w-4 text-gray-900" />}>
            התחל עכשיו
          </TextRollButton>
        </div>
      </div>
    </nav>
  );
};

// 3. Section Badge Component
const SectionBadge = ({
  number,
  label,
}: {
  number: number;
  label: string;
}) => {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <span className="text-xs font-semibold">{number}</span>
      </div>
      <span className="rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
};

// 4. Expanding Button Card
const ExpandingButtonCard = ({
  title,
  description,
  variant = "light",
}: {
  title: string;
  description: string;
  variant?: "light" | "dark";
}) => {
  return (
    <div className="group relative cursor-pointer overflow-hidden rounded-2xl bg-muted">
      <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 to-accent/10" />

      {/* Expanding button */}
      <div className="absolute bottom-4 start-4">
        <div
          className={`flex h-9 items-center overflow-hidden rounded-full transition-all duration-300 ease-in-out ${
            variant === "dark"
              ? "w-9 bg-gray-900 group-hover:w-36"
              : "w-9 bg-white group-hover:w-32"
          }`}
        >
          <span
            className={`whitespace-nowrap px-4 text-sm font-medium opacity-0 transition-opacity delay-100 duration-200 group-hover:opacity-100 ${
              variant === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            {variant === "dark" ? "צפה בפרויקט" : "למד עוד"}
          </span>
          <div
            className={`absolute end-1.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-0 ${
              variant === "dark" ? "bg-white" : "bg-primary"
            } -rotate-45`}
          >
            <ArrowRight
              className={`h-3.5 w-3.5 ${
                variant === "dark" ? "text-gray-900" : "text-primary-foreground"
              }`}
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
        <h3 className="mt-1 font-semibold text-foreground">{title}</h3>
      </div>
    </div>
  );
};

// 5. Trust Badge Component
const TrustBadge = () => {
  return (
    <motion.div
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 shadow-sm transition-shadow hover:shadow-md"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Shield className="h-5 w-5 text-primary" />
      <span className="text-sm font-medium text-foreground">אפליקציה מאובטחת</span>
      <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
        מומלץ
      </span>
    </motion.div>
  );
};

// 6. Feature Card with Hover Effect
const FeatureCardHover = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) => {
  return (
    <motion.div
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
      whileHover={{ y: -4 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
};

// Main Preview Component
export const DesignPreview = () => {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Navbar Preview */}
      <section className="border-b border-border bg-muted/30 px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            1. Pill Navbar עם שעון חי
          </h2>
          <div className="flex justify-center">
            <PillNavbar />
          </div>
        </div>
      </section>

      {/* Text Roll Buttons Preview */}
      <section className="border-b border-border px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            2. כפתורים עם אנימציית Text Roll
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <TextRollButton
              variant="primary"
              icon={<Download className="h-4 w-4 text-primary" />}
            >
              הורד עכשיו
            </TextRollButton>
            <TextRollButton
              variant="dark"
              icon={<ArrowRight className="h-4 w-4 text-gray-900" />}
            >
              התחל בחינם
            </TextRollButton>
            <TextRollButton variant="outline">
              למד עוד
            </TextRollButton>
          </div>
        </div>
      </section>

      {/* Section Badges Preview */}
      <section className="border-b border-border bg-muted/30 px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            3. Section Badges עם מספור
          </h2>
          <div className="space-y-6">
            <div>
              <SectionBadge number={1} label="היכרות עם Ten10" />
              <h3 className="text-3xl font-bold text-foreground">
                ניהול פיננסי חכם לקהילה הדתית
              </h3>
            </div>
            <div>
              <SectionBadge number={2} label="תכונות מרכזיות" />
              <h3 className="text-3xl font-bold text-foreground">
                כל מה שאתה צריך במקום אחד
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badge Preview */}
      <section className="border-b border-border px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            4. Trust Badges
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <TrustBadge />
            <motion.div
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 shadow-sm"
              whileHover={{ scale: 1.02 }}
            >
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium">4.9 דירוג משתמשים</span>
            </motion.div>
            <motion.div
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 shadow-sm"
              whileHover={{ scale: 1.02 }}
            >
              <Award className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium">100% חינמי</span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Expanding Button Cards Preview */}
      <section className="border-b border-border bg-muted/30 px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            5. כרטיסים עם כפתור מתרחב
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <ExpandingButtonCard
              title="מעקב הוצאות"
              description="עקוב אחר כל ההוצאות וההכנסות שלך בקלות ובנוחות"
              variant="light"
            />
            <ExpandingButtonCard
              title="חישוב מעשר"
              description="חישוב אוטומטי של מעשר לפי ההלכה עם דוחות מפורטים"
              variant="dark"
            />
          </div>
        </div>
      </section>

      {/* Feature Cards with Hover */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            6. כרטיסי תכונות עם אפקט Hover
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCardHover
              icon={Globe}
              title="גישה מכל מקום"
              description="עבוד מהדפדפן או מאפליקציית הדסקטופ - הנתונים מסונכרנים"
            />
            <FeatureCardHover
              icon={Shield}
              title="אבטחה מלאה"
              description="הנתונים שלך מוצפנים ומאובטחים בסטנדרטים הגבוהים ביותר"
            />
            <FeatureCardHover
              icon={Download}
              title="ייצוא נתונים"
              description="ייצא את הנתונים שלך בכל עת לאקסל או PDF"
            />
          </div>
        </div>
      </section>

      {/* Combined Hero Example */}
      <section className="border-t border-border bg-gradient-to-b from-muted/50 to-background px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-12 text-2xl font-bold text-foreground">
            🎯 דוגמה משולבת - Hero Section
          </h2>

          <SectionBadge number={1} label="ברוכים הבאים" />

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
            ניהול פיננסי חכם
            <br />
            <span className="text-primary">לקהילה הדתית</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            אפליקציה חינמית לניהול הוצאות, חישוב מעשרות וצדקה - בהתאם להלכה
          </p>

          <div className="mb-8 flex flex-wrap justify-center gap-4">
            <TextRollButton
              variant="primary"
              icon={<Download className="h-4 w-4 text-primary" />}
            >
              הורד לדסקטופ
            </TextRollButton>
            <TextRollButton
              variant="dark"
              icon={<Globe className="h-4 w-4 text-gray-900" />}
            >
              נסה בדפדפן
            </TextRollButton>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <TrustBadge />
            <motion.div
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 shadow-sm"
              whileHover={{ scale: 1.02 }}
            >
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium">4.9 דירוג</span>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DesignPreview;
