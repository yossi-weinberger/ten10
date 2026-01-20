// This function ONLY verifies a CAPTCHA token and returns a success/fail response.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface CaptchaPayload {
  captchaToken: string;
}

async function verifyCaptcha(token: string, ip: string) {
  const secret = Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET_KEY");
  if (!secret) throw new Error("CAPTCHA secret key is not configured.");

  const formdata = new FormData();
  formdata.append("secret", secret);
  formdata.append("response", token);
  formdata.append("remoteip", ip);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formdata,
    }
  );

  const data = await response.json();
  if (!data.success) {
    console.warn("CAPTCHA verification failed:", data["error-codes"]);
    throw new Error(
      `CAPTCHA verification failed: ${(data["error-codes"] || []).join(", ")}`
    );
  }
  return { success: true };
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin), status: 200 });
  }

  try {
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";

    const payload = await req.json();
    // The payload itself is the object we need, not nested
    const captchaToken = payload.captchaToken;

    if (!captchaToken) {
      throw new Error("Missing captchaToken in request body.");
    }

    await verifyCaptcha(captchaToken, ip);

    return new Response(
      JSON.stringify({ success: true, message: "CAPTCHA verified." }),
      {
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      status: 400,
    });
  }
});
