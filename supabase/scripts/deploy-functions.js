#!/usr/bin/env node

import { config } from "dotenv";
import { execSync } from "child_process";

// Load environment variables
config();

const projectRef = process.env.VITE_SUPABASE_PROJECT_REF;
const jwtSecret = process.env.JWT_SECRET;

if (!projectRef) {
  console.error(
    "Error: VITE_SUPABASE_PROJECT_REF environment variable is not set"
  );
  console.error(
    "Please make sure you have a .env file with VITE_SUPABASE_PROJECT_REF=your_project_id"
  );
  process.exit(1);
}

if (!jwtSecret) {
  console.error("Error: JWT_SECRET environment variable is not set");
  console.error(
    "Please make sure you have a .env file with JWT_SECRET=your_secure_secret"
  );
  process.exit(1);
}

console.log(`Deploying Supabase functions with project ref: ${projectRef}`);

try {
  // Set secrets for email functionality
  console.log("Setting JWT secret...");
  execSync(
    `npx supabase@latest secrets set JWT_SECRET="${jwtSecret}" --project-ref ${projectRef}`,
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
  console.log("- SES_FROM_NAME (optional: display name, e.g., 'תזכורת Ten10')");

  // Deploy send-reminder-emails function
  console.log("Deploying send-reminder-emails function...");
  execSync(
    `npx supabase@latest functions deploy send-reminder-emails --project-ref ${projectRef}`,
    {
      stdio: "inherit",
    }
  );

  // Deploy send-contact-email function
  console.log("Deploying send-contact-email function...");
  execSync(
    `npx supabase@latest functions deploy send-contact-email --project-ref ${projectRef}`,
    {
      stdio: "inherit",
    }
  );

  // Deploy send-new-user-email function (profiles INSERT)
  console.log("Deploying send-new-user-email function...");
  execSync(
    `npx supabase@latest functions deploy send-new-user-email --project-ref ${projectRef}`,
    {
      stdio: "inherit",
    }
  );

  // Deploy verify-captcha function
  console.log("Deploying verify-captcha function...");
  execSync(
    `npx supabase@latest functions deploy verify-captcha --project-ref ${projectRef}`,
    {
      stdio: "inherit",
    }
  );

  // Deploy verify-unsubscribe-token function
  console.log("Deploying verify-unsubscribe-token function...");
  execSync(
    `npx supabase@latest functions deploy verify-unsubscribe-token --project-ref ${projectRef}`,
    {
      stdio: "inherit",
    }
  );

  // Deploy process-email-request function (Cloudflare Email Routing)
  // IMPORTANT: Cloudflare authenticates with a shared secret (not a Supabase JWT),
  // so this function MUST be deployed with JWT verification disabled.
  console.log("Deploying process-email-request function (no-verify-jwt)...");
  execSync(
    `npx supabase@latest functions deploy process-email-request --no-verify-jwt --project-ref ${projectRef}`,
    {
      stdio: "inherit",
    }
  );

  // Note: Unsubscribe functionality handled by /unsubscribe page with JWT verification

  console.log("✅ All Supabase functions deployed successfully!");
} catch (error) {
  console.error("❌ Failed to deploy Supabase functions:", error.message);
  process.exit(1);
}
