/**
 * JWT Utilities for creating secure unsubscribe tokens
 * Used by the email service to generate signed tokens
 */

import { create } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

export interface UnsubscribeTokenPayload {
  userId: string;
  email: string;
  type: "reminder" | "all";
  exp: number;
}

/**
 * Creates a secure JWT token for unsubscribe links
 * @param userId - The user's UUID
 * @param email - The user's email address
 * @param type - Type of unsubscribe ('reminder' or 'all')
 * @param expirationHours - Token expiration in hours (default: 720 = 30 days)
 * @returns Promise<string> - The signed JWT token
 */
export async function createUnsubscribeToken(
  userId: string,
  email: string,
  type: "reminder" | "all" = "all",
  expirationHours: number = 720 // 30 days
): Promise<string> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(Deno.env.get("JWT_SECRET") ?? "fallback-secret"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const payload: UnsubscribeTokenPayload = {
      userId,
      email,
      type,
      exp: Math.floor(Date.now() / 1000) + expirationHours * 3600,
    };

    return await create({ alg: "HS256", typ: "JWT" }, payload, key);
  } catch (error) {
    console.error("Error creating unsubscribe token:", error);
    throw new Error("Failed to create unsubscribe token");
  }
}

/**
 * Generates unsubscribe URLs for email templates
 * @param userId - The user's UUID
 * @param email - The user's email address
 * @returns Promise<{reminderUrl: string, allUrl: string}> - Both unsubscribe URLs
 */
export async function generateUnsubscribeUrls(
  userId: string,
  email: string
): Promise<{ reminderUrl: string; allUrl: string }> {
  const baseUrl = "https://ten10-app.com/unsubscribe";

  const [reminderToken, allToken] = await Promise.all([
    createUnsubscribeToken(userId, email, "reminder"),
    createUnsubscribeToken(userId, email, "all"),
  ]);

  return {
    reminderUrl: `${baseUrl}?token=${reminderToken}&type=reminder`,
    allUrl: `${baseUrl}?token=${allToken}&type=all`,
  };
}
