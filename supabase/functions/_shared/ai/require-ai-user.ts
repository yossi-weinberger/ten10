import { createClient, type User } from "npm:@supabase/supabase-js@2.116.0";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../cors.ts";
import { aiUserAllowed } from "./ai-user-allowed.ts";
import { isAiIntakeEnabled } from "./enabled.ts";

type JsonResponse = Response & { __brand: "json" };

export interface RequireAiUserOptions {
  /**
   * Skip the isAiIntakeEnabled() check at the start. Used by ai-receipt-url which checks later with a savedReceipt condition.
   */
  skipEnabledCheck?: boolean;
  /**
   * Skip the aiUserAllowed() check. Used by ai-receipt-url which applies it conditionally.
   */
  skipAllowedCheck?: boolean;
  /**
   * Skip the current beta-consent check. Used only for a receipt already saved
   * on a transaction, which stays viewable when AI intake is off.
   */
  skipConsentCheck?: boolean;
  /**
   * Custom response body for the method-not-allowed case (defaults to { [key]: null }).
   */
  methodNotAllowedBody?: Record<string, unknown>;
  /**
   * Custom response body for the enabled-check case (defaults to { reason: "unavailable" }).
   */
  unavailableBody?: Record<string, unknown>;
  /**
   * Custom response body for the allowed-check case (defaults to same as method body).
   */
  notAllowedBody?: Record<string, unknown>;
}

export interface RequireAiUserSuccess {
  ok: true;
  origin: string | null;
  authHeader: string;
  userClient: SupabaseClient;
  user: User;
  userId: string;
}

export interface RequireAiUserFailure {
  ok: false;
  response: JsonResponse;
}

export type RequireAiUserResult = RequireAiUserSuccess | RequireAiUserFailure;

function json(origin: string | null, body: unknown, status: number): JsonResponse {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  }) as JsonResponse;
}

const BETA_CONSENT_REQUIRED_BODY = {
  error: "beta_consent_required",
  code: "beta_consent_required",
} as const;

function envValue(name: string): string {
  try {
    return Deno.env.get(name) ?? "";
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return "";
    throw error;
  }
}

/**
 * Service-role check through public.ai_has_current_beta_consent.
 * That wrapper calls ai.has_beta_consent with ai.current_beta_terms_version(),
 * which stays the SQL source of truth. PostgREST does not expose the ai schema.
 * Any RPC error, missing function, or non-true result denies.
 */
async function hasCurrentBetaConsent(userId: string): Promise<boolean> {
  const serviceKey = envValue("SUPABASE_SERVICE_ROLE_KEY").trim();
  const supabaseUrl = envValue("SUPABASE_URL");
  if (!serviceKey || !supabaseUrl) return false;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const consent = await admin.rpc("ai_has_current_beta_consent", { p_user_id: userId });
  if (consent.error) return false;
  return consent.data === true;
}

/**
 * Common setup block for AI edge functions: CORS preflight, method check, enabled check, auth user lookup, access check, and current beta consent.
 * Returns user data on success, or an early Response on failure.
 *
 * @example
 * ```ts
 * const setup = await requireAiUser(req, { methodNotAllowedBody: { intent: null } });
 * if (!setup.ok) return setup.response;
 * const { user, userId, origin } = setup;
 * ```
 */
export async function requireAiUser(
  req: Request,
  options: RequireAiUserOptions = {},
): Promise<RequireAiUserResult> {
  const origin = req.headers.get("origin");

  // CORS preflight
  if (req.method === "OPTIONS") {
    return { ok: false, response: new Response("ok", { headers: getCorsHeaders(origin) }) as JsonResponse };
  }

  // Method check
  if (req.method !== "POST") {
    const body = options.methodNotAllowedBody ?? { error: "Method not allowed" };
    return { ok: false, response: json(origin, body, 405) };
  }

  // Enabled check (skipped by ai-receipt-url)
  if (!options.skipEnabledCheck && !isAiIntakeEnabled()) {
    const body = options.unavailableBody ?? { reason: "unavailable" };
    return { ok: false, response: json(origin, body, 200) };
  }

  // Auth header check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, response: json(origin, { error: "Missing authorization" }, 401) };
  }

  // User lookup
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await userClient.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (userError || !userData.user) {
    return { ok: false, response: json(origin, { error: "Invalid token" }, 401) };
  }

  // Access check (skipped by ai-receipt-url which does it conditionally)
  if (!options.skipAllowedCheck && !(await aiUserAllowed(userData.user.id))) {
    const body = options.notAllowedBody ?? options.methodNotAllowedBody ?? { error: "Not allowed" };
    return { ok: false, response: json(origin, body, 200) };
  }

  if (!options.skipConsentCheck && !(await hasCurrentBetaConsent(userData.user.id))) {
    return { ok: false, response: json(origin, BETA_CONSENT_REQUIRED_BODY, 403) };
  }

  return {
    ok: true,
    origin,
    authHeader,
    userClient,
    user: userData.user,
    userId: userData.user.id,
  };
}
