/**
 * Ten10 Email Router
 * Receives emails to maaser@ten10-app.com (or others configured)
 * Validates and triggers Supabase Edge Function to send download link.
 */

export default {
  async email(message, env, ctx) {
    const BLOCK_SUBJECTS = ["out of office", "automatic reply", "undelivered"];
    const MAX_SIZE = 256 * 1024; // 256KB limit

    // 1. Basic Filters
    if (message.rawSize > MAX_SIZE) {
      console.log(`Blocked: Email too large (${message.rawSize} bytes)`);
      message.setReject("Message too large");
      return;
    }

    const subject = message.headers.get("subject") || "";
    if (BLOCK_SUBJECTS.some((s) => subject.toLowerCase().includes(s))) {
      console.log("Blocked: Auto-response subject");
      return; // Drop silently
    }

    const autoSubmitted = message.headers.get("auto-submitted");
    if (autoSubmitted && String(autoSubmitted).trim().toLowerCase() !== "no") {
      console.log("Blocked: Auto-Submitted header");
      return; // Drop silently
    }

    // 2. Extract Details
    const payload = {
      from: message.from,
      to: message.to,
      subject: subject,
      messageId: message.headers.get("message-id"),
    };

    // 3. Call Supabase Edge Function
    // Ensure you set SUPABASE_FUNCTION_URL and CLOUDFLARE_WORKER_SECRET in Cloudflare Worker Settings (Variables)
    const supabaseUrl = env.SUPABASE_FUNCTION_URL; // e.g. https://[ref].supabase.co/functions/v1/process-email-request
    const secret = env.CLOUDFLARE_WORKER_SECRET;

    if (!supabaseUrl || !secret) {
      console.error(
        "Missing configuration: SUPABASE_FUNCTION_URL or CLOUDFLARE_WORKER_SECRET"
      );
      // Fallback: Forward to admin so we don't lose the email if config is broken
      // await message.forward("ayw100@gmail.com");
      message.setReject("Internal Configuration Error");
      return;
    }

    try {
      const response = await fetch(supabaseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Supabase error: ${response.status} ${errText}`);
      }

      console.log(`Success: Processed email from ${message.from}`);

      // Optional: If you want to also forward a copy to admin, you can do:
      // await message.forward("ayw100@gmail.com");
    } catch (err) {
      console.error("Failed to process email:", err);
      // On failure, maybe forward to admin?
      // await message.forward("ayw100@gmail.com");
      message.setReject("Temporary System Error");
    }
  },
};
