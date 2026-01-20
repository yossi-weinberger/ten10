// supabase/functions/_shared/cors.ts

export const getCorsHeaders = (origin: string | null) => {
  const ALLOWED_ORIGINS = [
    "https://ten10-app.com",
    "https://www.ten10-app.com",
    "http://localhost:5173",
    "http://127.0.0.1:54321",
  ];

  // If origin is allowed, return it. Otherwise, return the first allowed origin.
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin || "")
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin!,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
};
