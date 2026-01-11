import { createClient, Session } from "@supabase/supabase-js";

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Basic validation
if (!supabaseUrl) {
  throw new Error("Missing environment variable: VITE_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing environment variable: VITE_SUPABASE_ANON_KEY");
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Session cache to avoid duplicate getSession calls during app initialization
// This significantly improves startup performance by preventing multiple network requests
let cachedSessionPromise: Promise<{ data: { session: Session | null }; error: any }> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5000; // Cache valid for 5 seconds (covers app init phase)

/**
 * Get session with caching to prevent duplicate calls during initialization.
 * Multiple simultaneous calls will share the same Promise.
 */
export async function getCachedSession() {
  const now = Date.now();
  
  // If cache is still valid, return cached promise
  if (cachedSessionPromise && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSessionPromise;
  }
  
  // Create new cached promise
  cacheTimestamp = now;
  cachedSessionPromise = supabase.auth.getSession();
  
  return cachedSessionPromise;
}

/**
 * Invalidate the session cache (call after login/logout)
 */
export function invalidateSessionCache() {
  cachedSessionPromise = null;
  cacheTimestamp = 0;
}
