import { supabase } from "@/lib/supabaseClient";
import i18n from "../i18n";
import { getPlatform } from "../platformManager";

// Platform info returned from Tauri backend
export interface DesktopPlatformInfo {
  appVersion: string;
  os: string;
  osVersion: string;
  arch: string;
}

export interface ContactFormData {
  channel: "halacha" | "dev";
  subject: string;
  body: string;
  severity?: "low" | "med" | "high";
  attachments?: File[]; // Updated to accept File objects
  captchaToken: string;
  userName?: string;
  userEmail?: string;
}

// Upload a single file to Supabase Storage
const uploadFile = async (
  file: File
): Promise<{ path: string; name: string } | null> => {
  // Supabase Storage requires ASCII-only filenames
  // We'll create a safe filename and preserve the original name in metadata
  const originalName = file.name;
  const fileExtension = originalName.substring(
    originalName.lastIndexOf(".") || 0
  );

  // Create a completely safe ASCII filename: timestamp + random string + extension
  // Use only alphanumeric characters, hyphens, and underscores
  const randomString = Math.random().toString(36).substring(2, 10); // 8 chars
  const timestamp = Date.now();

  // Ensure extension is ASCII-safe (remove any non-ASCII chars)
  const safeExtension = fileExtension.replace(/[^a-zA-Z0-9._-]/g, "") || ".bin";

  const safeFileName = `${timestamp}-${randomString}${safeExtension}`;

  const { data, error } = await supabase.storage
    .from("contact-attachments")
    .upload(safeFileName, file);

  if (error) {
    console.error(`Error uploading file ${file.name}:`, error);
    return null;
  }

  return { path: data.path, name: originalName }; // Return original name for display/email
};

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

  // Note: userAgent is sent directly to the database in insertPayload (line 77)
  // It was removed from augmentedFormData as it's not needed in the form submission flow

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

  // Step 2: Upload files if present
  let uploadedAttachments: { path: string; name: string }[] = [];
  if (formData.attachments && formData.attachments.length > 0) {
    const uploadPromises = formData.attachments.map((file) => uploadFile(file));
    const results = await Promise.all(uploadPromises);

    // Filter out any failed uploads
    uploadedAttachments = results.filter(
      (res): res is { path: string; name: string } => res !== null
    );
  }

  // Step 3: Insert data directly into the table
  const { captchaToken, userName, userEmail, attachments, ...restOfFormData } =
    formData;

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
    attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
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
 * Gets desktop platform information (app version, OS, architecture).
 * Only works when running in Tauri desktop environment.
 * @returns A promise that resolves with platform information.
 */
export async function getDesktopClientInfo(): Promise<DesktopPlatformInfo> {
  // Use a dynamic import for the Tauri API so it's not included in the web bundle.
  const { invoke } = await import("@tauri-apps/api/core");
  const platformInfo = await invoke<DesktopPlatformInfo>("get_platform_info");
  return platformInfo;
}

/**
 * Verifies a CAPTCHA token using a Supabase Edge Function.
 */

export const contactService = {
  submitContactForm,
};
