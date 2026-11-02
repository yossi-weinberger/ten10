import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    env: {
      VITE_AI_INTAKE_ENABLED: "true",
    },
    include: [
      "src/**/*.test.{ts,tsx}",
      "supabase/functions/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
  },
});
