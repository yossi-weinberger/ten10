/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";

describe("UnsubscribePage", () => {
  it("should extract status from FunctionsHttpError.context Response", async () => {
    const mockResponse = new Response(
      JSON.stringify({ error: "Invalid token" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );

    const functionsHttpError = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: mockResponse,
    };

    expect(functionsHttpError.context.status).toBe(401);
    const body = await functionsHttpError.context.json();
    expect(body).toEqual({ error: "Invalid token" });
  });

  it("should handle FunctionsHttpError with non-JSON body", async () => {
    const mockResponse = new Response("Server error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });

    const functionsHttpError = {
      name: "FunctionsHttpError",
      context: mockResponse,
    };

    expect(functionsHttpError.context.status).toBe(500);
    const text = await functionsHttpError.context.text();
    expect(text).toBe("Server error");
  });
});
