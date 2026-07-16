import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { SimpleEmailService } from "../_shared/simple-email-service.ts";
import { renderDownloadEmail } from "./email-template.ts";

const WORKER_SECRET = (Deno.env.get("CLOUDFLARE_WORKER_SECRET") ?? "").trim();
const JUMBOMAIL_LINK = (Deno.env.get("JUMBOMAIL_LINK") ?? "").trim();
const RATE_LIMIT_DAILY = 5;

type IncomingPayload = {
  from: string;
  to?: string;
  subject?: string;
  messageId?: string;
};

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  assets: GitHubAsset[];
}

async function getDirectDownloadLink(): Promise<string | null> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/yossi-weinberger/ten10/releases/latest",
      {
        headers: {
          "User-Agent": "Ten10-Email-Service",
          Accept: "application/vnd.github+json",
        },
      }
    );
    if (!response.ok) return null;
    const data: GitHubRelease = await response.json();

    // Prefer standard EXE (per-user, no admin), then MSI; exclude WebView2/offline exe from default
    const nameLower = (n: string) => n.toLowerCase();
    // Match useLatestRelease.ts: with_webview2, webview2, webview, offline
    const isWebView2Exe = (n: string) => {
      const lower = nameLower(n);
      return (
        (lower.endsWith(".exe") || lower.includes(".exe.")) &&
        (lower.includes("with_webview2") ||
          lower.includes("webview2") ||
          lower.includes("webview") ||
          lower.includes("offline"))
      );
    };

    const exe = data.assets.find((a) => {
      const lower = nameLower(a.name);
      return (
        (lower.endsWith(".exe") || lower.includes(".exe.")) &&
        !isWebView2Exe(a.name)
      );
    });
    if (exe) return exe.browser_download_url;

    const msi = data.assets.find((a) => {
      const lower = nameLower(a.name);
      return lower.endsWith(".msi") || lower.includes(".msi.");
    });
    if (msi) return msi.browser_download_url;

    return null;
  } catch (e) {
    console.error("Failed to fetch GitHub release:", e);
    return null;
  }
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  // BUGFIX (Security): never allow "Bearer undefined" bypass.
  // If the secret is missing, fail closed.
  if (!WORKER_SECRET) {
    console.error(
      "Misconfiguration: CLOUDFLARE_WORKER_SECRET is missing or empty"
    );
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: getCorsHeaders(origin),
    });
  }
  if (!JUMBOMAIL_LINK) {
    console.error("Misconfiguration: JUMBOMAIL_LINK is missing or empty");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: getCorsHeaders(origin),
    });
  }

  let supabaseClient: SupabaseClient | null = null;
  let from: string | undefined;
  let to: string | undefined;
  let subject: string | undefined;
  let messageId: string | undefined;

  try {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${WORKER_SECRET}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: getCorsHeaders(origin),
      });
    }

    const body = (await req.json()) as Partial<IncomingPayload>;
    ({ from, to, subject, messageId } = body);

    if (!from) {
      return new Response(
        JSON.stringify({ error: "Missing 'from' parameter" }),
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

    // Init Supabase
    supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Rate Limit Check via RPC
    const { data: currentCount, error: rpcError } = await supabaseClient.rpc(
      "increment_download_count",
      {
        p_email: from,
      }
    );

    if (rpcError) {
      throw new Error(`RPC Error: ${rpcError.message}`);
    }
    if (typeof currentCount !== "number" || !Number.isFinite(currentCount)) {
      throw new Error(
        "RPC Error: increment_download_count returned invalid data"
      );
    }

    // Prepare log data
    const logData = {
      from_email: from,
      reason: null,
      metadata: { to, subject, messageId, currentCount },
    };

    // Check limit
    if (currentCount > RATE_LIMIT_DAILY) {
      await supabaseClient.from("download_requests").insert({
        ...logData,
        status: "blocked",
        reason: "Rate limit exceeded",
      });
      return new Response(
        JSON.stringify({ status: "blocked", reason: "Rate limit" }),
        {
          status: 429,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Send Email
    // Uses SES_FROM_MAASER if set, otherwise defaults to maaser@ten10-app.com (must be verified in SES)
    const senderEmail =
      Deno.env.get("SES_FROM_MAASER") ?? "maaser@ten10-app.com";
    const emailService = new SimpleEmailService(senderEmail);

    const directDownloadLink = await getDirectDownloadLink();

    const renderedEmail = renderDownloadEmail({
      jumboMailLink: JUMBOMAIL_LINK,
      directDownloadLink,
    });

    const sesResponse = await emailService.sendRawEmail({
      to: from,
      subject: renderedEmail.subject,
      textBody: renderedEmail.textBody,
      htmlBody: renderedEmail.htmlBody,
    });

    // Update Log to sent
    await supabaseClient.from("download_requests").insert({
      ...logData,
      status: "sent",
      metadata: {
        ...(logData.metadata ?? {}),
        sesMessageId:
          typeof sesResponse?.MessageId === "string"
            ? sesResponse.MessageId
            : undefined,
      },
    });

    return new Response(JSON.stringify({ status: "sent" }), {
      headers: getCorsHeaders(origin),
    });
  } catch (error) {
    console.error("Error processing email request:", error);
    const errorMessage =
      error instanceof Error ? error.message : String(error ?? "Unknown error");

    // BUGFIX (Observability): log failed attempts as status=error whenever possible.
    try {
      if (supabaseClient && from) {
        await supabaseClient.from("download_requests").insert({
          from_email: from,
          status: "error",
          reason: errorMessage,
          metadata: { to, subject, messageId },
        });
      }
    } catch (logError) {
      console.error("Failed to write download_requests error log:", logError);
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: getCorsHeaders(origin),
    });
  }
});
