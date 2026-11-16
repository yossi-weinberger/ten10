/**
 * Authorization and input validation helpers for send-new-user-email.
 * 
 * Auth relies on verify_jwt=true in config.toml: the gateway validates JWT signature
 * before the function runs. We only check role and expiration on the verified claims.
 */

const DEFAULT_WINDOW_HOURS = 24;

/**
 * Validates that the Authorization header contains a valid service_role JWT.
 * Requires verify_jwt=true in config.toml (gateway already verified signature).
 * 
 * @returns { authorized: true, hours: number } if valid service_role with optional hours
 * @returns { authorized: false, status: number, error: string } if invalid
 */
export function validateServiceRoleAuth(
  authHeader: string | null,
  bodyHours?: unknown,
): 
  | { authorized: true; hours: number }
  | { authorized: false; status: number; error: string } {
  
  // Parse Authorization header strictly
  if (!authHeader) {
    return { authorized: false, status: 401, error: "Unauthorized - Missing Authorization header" };
  }

  // Must start with 'Bearer ' (case-insensitive)
  const bearerPrefix = authHeader.slice(0, 7);
  if (bearerPrefix.toLowerCase() !== "bearer ") {
    return { authorized: false, status: 401, error: "Unauthorized - Invalid Authorization format" };
  }

  const token = authHeader.slice(7);
  if (!token) {
    return { authorized: false, status: 401, error: "Unauthorized - Missing token" };
  }

  // Decode JWT payload (base64url-safe: replace -/_ and pad)
  let tokenData: { role?: string; exp?: number };
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { authorized: false, status: 401, error: "Invalid token format" };
    }

    // Base64url decode: replace - with +, _ with /, and pad
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4 !== 0) {
      payload += "=";
    }
    
    tokenData = JSON.parse(atob(payload));
  } catch {
    return { authorized: false, status: 401, error: "Invalid token format" };
  }

  // Check role (gateway already verified signature via verify_jwt=true)
  if (tokenData.role !== "service_role") {
    return { authorized: false, status: 403, error: "Forbidden - service_role required" };
  }

  // Check expiration
  if (tokenData.exp && tokenData.exp < Date.now() / 1000) {
    return { authorized: false, status: 401, error: "Token expired" };
  }

  // Validate and clamp hours
  const hours = validateHours(bodyHours);

  return { authorized: true, hours };
}

/**
 * Validates and clamps hours to 1-168 (1 week max).
 * Falls back to DEFAULT_WINDOW_HOURS (24) for any invalid input.
 */
export function validateHours(requested: unknown): number {
  if (typeof requested !== "number") {
    return DEFAULT_WINDOW_HOURS;
  }
  
  const hours = Number(requested);
  if (Number.isInteger(hours) && hours >= 1 && hours <= 168) {
    return hours;
  }
  
  return DEFAULT_WINDOW_HOURS;
}
