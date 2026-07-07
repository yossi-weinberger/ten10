import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import {
  identifyPostHogUser,
  isPostHogSupported,
} from "@/lib/analytics/posthogClient";

async function resolveDisplayName(user: User): Promise<string | undefined> {
  const fromMetadata = user.user_metadata?.full_name;
  if (typeof fromMetadata === "string" && fromMetadata.trim()) {
    return fromMetadata.trim();
  }

  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const fromProfile = data?.full_name;
  if (typeof fromProfile === "string" && fromProfile.trim()) {
    return fromProfile.trim();
  }

  return undefined;
}

export async function syncPostHogUserIdentity(
  user: User,
  language: string
): Promise<void> {
  if (!isPostHogSupported()) return;

  const name = await resolveDisplayName(user);

  identifyPostHogUser(user, language, {
    name,
    email: user.email?.trim() || undefined,
  });
}
