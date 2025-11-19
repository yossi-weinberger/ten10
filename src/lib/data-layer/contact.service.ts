import { supabase } from "@/lib/supabaseClient";
import { Platform } from "@/components/features/settings/platform-section";
import { getErrorMessage } from "@/lib/utils";
import i18n from "../i18n";
import { getPlatform } from "../platformManager";

export interface ContactFormData {
  channel: "halacha" | "dev";
  subject: string;
  body: string;
  severity?: "low" | "med" | "high";
  attachments?: { path: string; name: string }[];
  captchaToken: string;
  userName?: string;
  userEmail?: string;
}

// No longer need ContactFullPayload as the Edge Function will handle metadata

const submitContactForm = async (formData: ContactFormData) => {
  const platform = getPlatform();
  let app_version: string | undefined;

  if (platform === "desktop") {
    try {
      const info: { appVersion: string } = await getDesktopClientInfo();
      app_version = info.appVersion;
    } catch (error) {
      console.error("Error getting desktop app version:", error);
    }
  }

  // Add User Agent to the form data
  const augmentedFormData = {
    ...formData,
    // userAgent: navigator.userAgent, // Temporarily removed
  };

  // Step 1: Verify CAPTCHA using a standard fetch call
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const verifyResponse = await fetch(
    `${supabaseUrl}/functions/v1/verify-captcha`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ captchaToken: formData.captchaToken }),
    }
  );

  if (!verifyResponse.ok) {
    const errorBody = await verifyResponse.json();
    console.error("CAPTCHA verification failed:", errorBody.error);
    return {
      success: false,
      error: `CAPTCHA verification failed: ${errorBody.error}`,
    };
  }

  // Step 2: Insert data directly into the table
  const { captchaToken, userName, userEmail, ...restOfFormData } = formData;

  const insertPayload = {
    ...restOfFormData,
    client_platform: platform,
    app_version,
    locale: i18n.language,
    verified_captcha: true,
    user_agent: navigator.userAgent,
    // Map to snake_case for the database
    user_name: userName,
    user_email: userEmail,
  };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("User not authenticated:", userError);
    return { success: false, error: "User not authenticated." };
  }

  const { data, error: insertError } = await supabase
    .from("contact_messages")
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    console.error("Error submitting contact form:", insertError.message);
    return { success: false, error: insertError.message };
  }

  const ticketId = `TEN-${new Date(data.created_at).getFullYear()}-${data.id
    .substring(0, 5)
    .toUpperCase()}`;

  return { success: true, ticketId };
};

/**
 * Submits the contact form data to the Supabase database.
 * @returns A promise that resolves when the submission is complete.
 */
export async function getDesktopClientInfo(): Promise<Platform> {
  // Use a dynamic import for the Tauri API so it's not included in the web bundle.
  const { invoke } = await import("@tauri-apps/api/core");
  const platformInfo = await invoke<Platform>("get_platform_info");
  return platformInfo;
}

/**
 * Verifies a CAPTCHA token using a Supabase Edge Function.
 */

export const contactService = {
  submitContactForm,
};
