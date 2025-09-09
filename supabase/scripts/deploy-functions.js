#!/usr/bin/env node

import { config } from "dotenv";
import { execSync } from "child_process";

// Load environment variables
config();

const projectRef = process.env.VITE_SUPABASE_PROJECT_REF;

if (!projectRef) {
  console.error(
    "Error: VITE_SUPABASE_PROJECT_REF environment variable is not set"
  );
  console.error(
    "Please make sure you have a .env file with VITE_SUPABASE_PROJECT_REF=your_project_id"
  );
  process.exit(1);
}

console.log(`Deploying Supabase functions with project ref: ${projectRef}`);

try {
  execSync(
    `npx supabase@latest functions deploy send-reminder-emails --project-ref ${projectRef}`,
    {
      stdio: "inherit",
    }
  );
  console.log("✅ Supabase functions deployed successfully!");
} catch (error) {
  console.error("❌ Failed to deploy Supabase functions:", error.message);
  process.exit(1);
}
