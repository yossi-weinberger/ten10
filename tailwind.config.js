/** @type {import('tailwindcss').Config} */

/*
  Tailwind CSS Configuration
  --------------------------
  This configuration extends the default Tailwind theme to match the project's design system.
  
  Key Extensions:
  - Colors: Maps CSS variables (defined in index.css) to Tailwind color utilities (e.g., `bg-primary`, `text-muted`).
  - Animations: Adds custom keyframes like 'accordion-down', 'float', and 'shimmer',
    plus the 'brand-*' group used by the animated Ten10 symbol (src/components/brand).
  - Fonts: Sets 'Assistant' as the primary sans-serif font.
  - Container: Centralizes the main content container with responsive padding.
  
  Plugins:
  - @tailwindcss/forms: Resets form element styles for better cross-browser consistency.
  - tailwindcss-animate: Adds utility classes for standard animations.
*/

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
        },
        info: {
          DEFAULT: "hsl(var(--info) / <alpha-value>)",
          foreground: "hsl(var(--info-foreground) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Assistant", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(0, 0, 0, 0.1)",
        hover: "0 8px 20px -4px rgba(0, 0, 0, 0.15)",
        input:
          "0px 2px 3px -1px rgba(0,0,0,0.1), 0px 1px 0px 0px rgba(25,28,33,0.02), 0px 0px 0px 1px rgba(25,28,33,0.08)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        aurora: {
          from: {
            backgroundPosition: "50% 50%, 50% 50%",
          },
          to: {
            backgroundPosition: "350% 50%, 350% 50%",
          },
        },
        spotlight: {
          "0%": {
            opacity: 0,
            transform: "translate(-72%, -62%) scale(0.5)",
          },
          "100%": {
            opacity: 1,
            transform: "translate(-50%,-40%) scale(1)",
          },
        },
        shimmer: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        "text-shimmer": {
          from: { backgroundPosition: "100% 0" },
          to: { backgroundPosition: "0% 0" },
        },
        "receipt-scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" },
        },
        // Brand motion: the animated Ten10 symbol (src/components/brand).
        // See llm-instructions/ui/brand-motion-guide.md before adding to this group.
        "brand-fling": {
          "50%": { transform: "rotate(-5deg) translate(4px, -4px)" },
        },
        "brand-pulse": {
          "50%": { opacity: "0.45" },
        },
        "brand-done-settle": {
          from: { transform: "rotate(-200deg)" },
          to: { transform: "rotate(0deg)" },
        },
        "brand-done-click": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "35%": { transform: "translate(-1.8px, 1.8px)" },
          "70%": { transform: "translate(0.7px, -0.7px)" },
        },
        "brand-done-ripple": {
          from: { opacity: "0.55", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(1.38)" },
        },
        "brand-done-check": {
          from: { strokeDashoffset: "100" },
          to: { strokeDashoffset: "0" },
        },
        "brand-404-shake": {
          "0%, 25%, 100%": { transform: "translateX(0)" },
          "5%": { transform: "translateX(-3px)" },
          "9%": { transform: "translateX(3px)" },
          "13%": { transform: "translateX(-2.5px)" },
          "17%": { transform: "translateX(2px)" },
          "21%": { transform: "translateX(-1px)" },
        },
        // The 404 keyframes leave out 100%: they end on the component's resting pose
        // (its base classes), so that pose is written in one place.
        "brand-404-look": {
          "0%, 62%": { transform: "rotate(0deg)", animationTimingFunction: "ease-in-out" },
          "85%": { transform: "rotate(12deg)" },
        },
        "brand-404-fall": {
          "0%, 22%": { transform: "translate(0, 0) rotate(0deg)", animationTimingFunction: "ease-out" },
          "30%": {
            transform: "translate(1px, -2px) rotate(16deg)",
            animationTimingFunction: "cubic-bezier(0.5, 0, 0.9, 0.5)",
          },
          "50%": { transform: "translate(-9px, 81px) rotate(100deg)", animationTimingFunction: "ease-out" },
          "57%": { transform: "translate(-9px, 72px) rotate(108deg)", animationTimingFunction: "ease-in" },
          "64%": { transform: "translate(-9px, 81px) rotate(100deg)", animationTimingFunction: "ease-in-out" },
          "72%": { transform: "translate(-9px, 81px) rotate(107deg)", animationTimingFunction: "ease-in-out" },
          "80%": { transform: "translate(-9px, 81px) rotate(95deg)", animationTimingFunction: "ease-in-out" },
          "88%": { transform: "translate(-9px, 81px) rotate(103deg)", animationTimingFunction: "ease-in-out" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-out",
        "collapsible-up": "collapsible-up 0.2s ease-out",
        float: "float 3s ease-in-out infinite",
        aurora: "aurora 60s linear infinite",
        spotlight: "spotlight 2s ease .75s 1 forwards",
        shimmer: "shimmer 2s linear infinite",
        "text-shimmer": "text-shimmer 1.8s linear infinite",
        "receipt-scan": "receipt-scan 1.4s cubic-bezier(0.25,1,0.5,1) infinite",
        // Brand motion. Apply these with `motion-safe:` and give every component a
        // `motion-reduce:` fallback (see llm-instructions/ui/brand-motion-guide.md).
        "brand-spin": "spin 1.5s cubic-bezier(0.6, 0, 0.4, 1) infinite",
        "brand-fling": "brand-fling 1.5s ease-in-out infinite",
        "brand-pulse": "brand-pulse 2s ease-in-out infinite",
        "brand-done-settle": "brand-done-settle 0.8s cubic-bezier(0.2, 0.6, 0.35, 1) both",
        "brand-done-click": "brand-done-click 0.35s ease-out 0.75s both",
        "brand-done-ripple": "brand-done-ripple 0.7s cubic-bezier(0.2, 0.7, 0.3, 1) 0.8s forwards",
        "brand-done-check": "brand-done-check 0.45s cubic-bezier(0.6, 0, 0.3, 1) 0.85s both",
        "brand-404-shake": "brand-404-shake 2.6s ease-out 0.3s both",
        "brand-404-look": "brand-404-look 2.6s linear 0.3s both",
        "brand-404-fall": "brand-404-fall 2.6s linear 0.3s both",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("tailwindcss-animate"),
    function ({ addVariant }) {
      // Tailwind v4: migrate to @custom-variant short (...) in CSS
      addVariant('short', '@media (min-width: 1024px) and (max-height: 799px) { &:is(&) }');
    },
  ],
};
