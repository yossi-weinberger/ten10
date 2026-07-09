import { supabase } from "@/lib/supabaseClient";

export interface UserProfileDisplay {
  fullName: string | null;
  avatarUrl: string | null;
}

/**
 * Web-only: fetches a user's display name and resolved avatar URL from the
 * `profiles` table. `avatar_url` may be a full URL or a Storage path in the
 * `avatars` bucket — this resolves either case to a usable URL.
 */
export async function fetchUserProfileDisplay(userId: string): Promise<UserProfileDisplay> {
  const { data, error, status } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .single();

  if (error && status !== 406) {
    throw error;
  }

  const fullName: string | null = data?.full_name || null;
  let avatarUrl: string | null = null;
  if (data?.avatar_url) {
    if (data.avatar_url.startsWith("http://") || data.avatar_url.startsWith("https://")) {
      avatarUrl = data.avatar_url;
    } else {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.avatar_url);
      avatarUrl = urlData.publicUrl;
    }
  }

  return { fullName, avatarUrl };
}

/**
 * Web-only: loads `full_name` for the profile edit form.
 * Treats a missing row (406) as an empty name instead of throwing.
 */
export async function fetchProfileFullName(userId: string): Promise<string> {
  const { data, error, status } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  if (error && status !== 406) {
    throw error;
  }

  return data?.full_name ?? "";
}

/**
 * Web-only: updates `full_name` on the `profiles` table.
 * Pass an empty string to clear the name (stored as null).
 */
export async function updateProfileFullName(userId: string, fullName: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}
