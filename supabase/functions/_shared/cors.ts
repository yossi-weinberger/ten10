// supabase/functions/_shared/cors.ts

function readSupabaseUrl(): string {
  try {
    return Deno.env.get("SUPABASE_URL") || "";
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return "";
    throw error;
  }
}

export const getCorsHeaders = (
  origin: string | null,
): Record<string, string> => {
  const ALLOWED_ORIGINS = [
    "https://ten10-app.com",
    "https://www.ten10-app.com",
    "http://localhost:5173",
    "http://127.0.0.1:54321",
  ];
  const PREVIEW_ORIGIN = /^https:\/\/ten10-[a-z0-9-]+-yossi-weinbergers-projects\.vercel\.app$/;

  // TESTING only: any https://*.vercel.app. Team preview deploys stay allowed on every project.
  // Deno tests run without env permission, so a denied read stays closed.
  const supabaseUrl = readSupabaseUrl();
  const isTestingProject = supabaseUrl.includes("bbcllewcotypedqsnwmi");
  const isVercelPreview = origin && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

  if (
    origin &&
    (ALLOWED_ORIGINS.includes(origin) ||
      PREVIEW_ORIGIN.test(origin) ||
      (isTestingProject && isVercelPreview))
  ) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Credentials": "true",
    };
  }

  // If no origin (e.g. server-to-server / curl), default to the first allowed origin
  // to allow the request to proceed (tools don't check CORS usually).
  if (!origin) {
    return {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Credentials": "true",
    };
  }

  // If origin is present but not allowed, do NOT send Access-Control-Allow-Origin header.
  // This causes the browser to block the cross-origin request (CORS failure).
  // Note: Returning "null" as a string is a security risk because sandboxed iframes
  // and data: URLs send "Origin: null" and would match it!
  return {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
};
