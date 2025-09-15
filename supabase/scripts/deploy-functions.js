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
  // Set secrets for email functionality
  console.log("Setting JWT secret...");
  execSync(
    `npx supabase@latest secrets set JWT_SECRET="M4G3el9m139YzCuNb7TqD0VoQ3KlK21XOt63ekWWmG4=" --project-ref ${projectRef}`,
    {
      stdio: "inherit",
    }
  );

  console.log(
    "Setting AWS credentials (you'll need to configure these manually)..."
  );
  console.log("Required environment variables for SES:");
  console.log("- AWS_ACCESS_KEY_ID");
  console.log("- AWS_SECRET_ACCESS_KEY");
  console.log("- AWS_REGION (default: eu-central-1)");
  console.log("- SES_FROM (default: reminder-noreply@ten10-app.com)");

  // Deploy send-reminder-emails function
  console.log("Deploying send-reminder-emails function...");
  execSync(
    `npx supabase@latest functions deploy send-reminder-emails --project-ref ${projectRef}`,
    {
      stdio: "inherit",
    }
  );

  // Note: Unsubscribe functionality moved to main website (/unsubscribe page)

  console.log("✅ All Supabase functions deployed successfully!");
} catch (error) {
  console.error("❌ Failed to deploy Supabase functions:", error.message);
  process.exit(1);
}
