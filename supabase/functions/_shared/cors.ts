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

  // If origin is present but not allowed, return 'null' to explicitly block it in browser.
  // We MUST NOT send 'Access-Control-Allow-Credentials: true' with 'null' origin.
  return {
    "Access-Control-Allow-Origin": "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
};
