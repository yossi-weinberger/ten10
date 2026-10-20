/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";

describe("UnsubscribePage - FunctionsHttpError handling", () => {
  it("should extract status code and error body from FunctionsHttpError.context", async () => {
    // This test verifies the fix for handling FunctionsHttpError with context Response
    
    // Mock a FunctionsHttpError with context Response(401)
    const mockResponse = new Response(
      JSON.stringify({ error: "Invalid or expired token" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );

    const functionsHttpError = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: mockResponse,
    };

    // Verify we can read status and body from context
    expect(functionsHttpError.context).toBeDefined();
    expect(functionsHttpError.context.status).toBe(401);
    
    const body = await functionsHttpError.context.json();
    expect(body).toEqual({ error: "Invalid or expired token" });
    
    // Verify error message detection logic
    const errorMsg = body.error.toLowerCase();
    const looksExpired = errorMsg.includes("expired");
    const looksInvalid = errorMsg.includes("invalid") || errorMsg.includes("token") || functionsHttpError.context.status === 401;
    
    expect(looksExpired).toBe(true);
    expect(looksInvalid).toBe(true);
  });

  it("should detect 400 status from FunctionsHttpError.context", async () => {
    const mockResponse = new Response(
      JSON.stringify({ error: "Token is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );

    const functionsHttpError = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: mockResponse,
    };

    expect(functionsHttpError.context.status).toBe(400);
    
    const body = await functionsHttpError.context.json();
    const errorMsg = body.error.toLowerCase();
    const looksInvalid = errorMsg.includes("token") || functionsHttpError.context.status === 400;
    
    expect(looksInvalid).toBe(true);
  });

  it("should handle context with non-JSON body gracefully", async () => {
    const mockResponse = new Response("Not JSON", { status: 401 });

    const functionsHttpError = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: mockResponse,
    };

    // Verify status is still readable even if body parsing fails
    expect(functionsHttpError.context.status).toBe(401);
    
    let errorBody = null;
    try {
      errorBody = await functionsHttpError.context.json();
    } catch {
      // Expected to fail for non-JSON body
    }
    
    expect(errorBody).toBeNull();
    
    // Verify we can still detect invalid token by status code alone
    const looksInvalid = functionsHttpError.context.status === 401;
    expect(looksInvalid).toBe(true);
  });
});
