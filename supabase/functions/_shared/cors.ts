// supabase/functions/_shared/cors.ts

export const getCorsHeaders = (origin: string | null) => {
  const ALLOWED_ORIGINS = [
    "https://ten10-app.com",
    "https://www.ten10-app.com",
    "http://localhost:5173",
    "http://127.0.0.1:54321",
  ];

  // If origin is allowed, return it.
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
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
