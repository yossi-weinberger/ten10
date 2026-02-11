/**
 * One-off script: OKLCH → HSL for theme variables.
 * Run: node scripts/convert-oklch-to-hsl.mjs
 * Requires: npm i -D colorjs.io
 */
import Color from "colorjs.io";

const light = {
  background: [0.99, 0.01, 95],
  foreground: [0.2, 0.02, 95],
  card: [0.98, 0.01, 95],
  "card-foreground": [0.2, 0.02, 95],
  popover: [0.99, 0.01, 95],
  "popover-foreground": [0.2, 0.02, 95],
  muted: [0.94, 0.01, 95],
  "muted-foreground": [0.55, 0.02, 95],
  border: [0.9, 0.01, 95],
  input: [0.92, 0.01, 95],
  primary: [0.4686, 0.0751, 198.61],
  "primary-foreground": [0.99, 0.01, 95],
  secondary: [0.9, 0.04, 155],
  "secondary-foreground": [0.3, 0.04, 155],
  accent: [0.8267, 0.168963, 90.4589],
  "accent-foreground": [0.28, 0.04, 85],
  destructive: [0.57, 0.2, 23],
  "destructive-foreground": [0.99, 0.01, 95],
  success: [0.62, 0.13, 145],
  "success-foreground": [0.99, 0.01, 95],
  warning: [0.7, 0.15, 90],
  "warning-foreground": [0.24, 0.04, 90],
  info: [0.64, 0.14, 220],
  "info-foreground": [0.99, 0.01, 95],
  ring: [0.4686, 0.0751, 198.61],
};

const dark = {
  background: [0.15, 0.02, 95],
  foreground: [0.96, 0.01, 95],
  card: [0.2, 0.02, 95],
  "card-foreground": [0.96, 0.01, 95],
  popover: [0.22, 0.02, 95],
  "popover-foreground": [0.96, 0.01, 95],
  muted: [0.26, 0.02, 95],
  "muted-foreground": [0.8, 0.02, 95],
  border: [0.32, 0.02, 95],
  input: [0.3, 0.02, 95],
  primary: [0.72, 0.0751, 198.61],
  "primary-foreground": [0.12, 0.02, 198.61],
  secondary: [0.28, 0.05, 155],
  "secondary-foreground": [0.9, 0.02, 155],
  accent: [0.8267, 0.168963, 90.4589],
  "accent-foreground": [0.2, 0.04, 85],
  destructive: [0.62, 0.21, 23],
  "destructive-foreground": [0.99, 0.01, 95],
  success: [0.68, 0.14, 145],
  "success-foreground": [0.12, 0.02, 145],
  warning: [0.76, 0.16, 90],
  "warning-foreground": [0.22, 0.04, 90],
  info: [0.7, 0.15, 220],
  "info-foreground": [0.1, 0.02, 220],
  ring: [0.72, 0.0751, 198.61],
};

function oklchToHslString(oklchArr) {
  const c = new Color("oklch", oklchArr);
  const [h, s, l] = c.to("hsl").coords; // Color.js: H 0-360, S/L may exceed 100
  const sNorm = Math.min(100, Math.round(Number(s) || 0));
  const lNorm = Math.min(100, Math.round(Number(l) || 0));
  return `${Math.round(Number(h) || 0)} ${sNorm}% ${lNorm}%`;
}

function dumpTheme(name, vars) {
  console.log(`\n/* ${name} */`);
  for (const [key, oklch] of Object.entries(vars)) {
    const hsl = oklchToHslString(oklch);
    console.log(`  --${key}: ${hsl};`);
  }
}

console.log("/* Paste into index.css – light theme */");
dumpTheme("Light", light);
console.log("\n/* Paste into index.css – dark theme */");
dumpTheme("Dark", dark);
