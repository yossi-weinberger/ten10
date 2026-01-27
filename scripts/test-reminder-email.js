/**
 * Script to manually test the send-reminder-emails function
 * This will help us see what's actually happening
 *
 * Usage:
 * 1. Get your SUPABASE_ANON_KEY from Supabase Dashboard
 * 2. Run: node scripts/test-reminder-email.js
 */

const SUPABASE_URL = "https://flpzqbvbymoluoeeeofg.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "YOUR_ANON_KEY_HERE";

async function testReminderEmail() {
  console.log("Testing send-reminder-emails function...\n");

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-reminder-emails`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ test: true }), // Test mode - bypasses day check
      },
    );

    const data = await response.json();

    console.log("Response Status:", response.status);
    console.log("Response Data:", JSON.stringify(data, null, 2));

    if (data.results) {
      console.log("\n=== Email Sending Results ===");
      data.results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.email}:`);
        console.log(`   Status: ${result.status}`);
        if (result.status === "sent") {
          console.log(`   Message ID: ${result.messageId}`);
        } else if (result.status === "failed") {
          console.log(`   Error: ${result.error}`);
        }
      });
    }
  } catch (error) {
    console.error("Error testing function:", error);
  }
}

testReminderEmail();
