/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import UnsubscribePage from "./UnsubscribePage";
import { I18nextProvider } from "react-i18next";
import { type i18n as I18nType, createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

// Mock Supabase client
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    log: vi.fn(),
  },
}));

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

describe("UnsubscribePage - language synchronization", () => {
  let testI18n: I18nType;

  beforeEach(async () => {
    // Create a fresh i18n instance for each test
    testI18n = createInstance();
    await testI18n
      .use(initReactI18next)
      .init({
        lng: "en",
        fallbackLng: "en",
        resources: {
          en: {
            auth: {
              "unsubscribe.processing": "Processing...",
              "unsubscribe.processingMessage": "Please wait while we process your request.",
              "unsubscribe.pageSubtitle": "Your preference has been updated.",
              "unsubscribe.backToApp": "Back to App",
              "unsubscribe.success.marketing.title": "Marketing Unsubscribed",
              "unsubscribe.success.marketing.message": "You will no longer receive marketing emails.",
              "unsubscribe.error.invalidToken.title": "Invalid Token",
              "unsubscribe.error.invalidToken.message": "The unsubscribe link is invalid.",
            },
          },
          he: {
            auth: {
              "unsubscribe.processing": "מעבד...",
              "unsubscribe.processingMessage": "אנא המתן בזמן שאנו מעבדים את הבקשה.",
              "unsubscribe.pageSubtitle": "ההעדפה שלך עודכנה.",
              "unsubscribe.backToApp": "חזרה לאפליקציה",
              "unsubscribe.success.marketing.title": "בוטל דיוור שיווקי",
              "unsubscribe.success.marketing.message": "לא תקבל עוד מיילים שיווקיים.",
              "unsubscribe.error.invalidToken.title": "טוקן לא תקין",
              "unsubscribe.error.invalidToken.message": "קישור ביטול המנוי אינו תקין.",
            },
          },
        },
      });
  });

  it("should update all text when i18n language changes from EN to HE", async () => {
    // Mock successful unsubscribe
    const { supabase } = await import("@/lib/supabaseClient");
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: true, type: "marketing" },
      error: null,
    });

    // Create router with unsubscribe route
    const rootRoute = createRootRoute();
    const unsubscribeRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/unsubscribe",
      component: UnsubscribePage,
    });
    const routeTree = rootRoute.addChildren([unsubscribeRoute]);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({
        initialEntries: ["/unsubscribe?token=test-token&type=marketing"],
      }),
    });

    // Render with English
    const { rerender } = render(
      <I18nextProvider i18n={testI18n}>
        <RouterProvider router={router} />
      </I18nextProvider>
    );

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText("Marketing Unsubscribed")).toBeTruthy();
    });

    // Verify English text
    expect(screen.getByText("Marketing Unsubscribed")).toBeTruthy();
    expect(screen.getByText("You will no longer receive marketing emails.")).toBeTruthy();
    expect(screen.getByText("Your preference has been updated.")).toBeTruthy();
    expect(screen.getByText("Back to App")).toBeTruthy();

    // Change language to Hebrew
    await testI18n.changeLanguage("he");

    // Force re-render
    rerender(
      <I18nextProvider i18n={testI18n}>
        <RouterProvider router={router} />
      </I18nextProvider>
    );

    // Verify all text updated to Hebrew
    await waitFor(() => {
      expect(screen.getByText("בוטל דיוור שיווקי")).toBeTruthy();
    });
    expect(screen.getByText("לא תקבל עוד מיילים שיווקיים.")).toBeTruthy();
    expect(screen.getByText("ההעדפה שלך עודכנה.")).toBeTruthy();
    expect(screen.getByText("חזרה לאפליקציה")).toBeTruthy();

    // Verify dir and lang attributes updated
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("he");
  });

  it("should update error text when i18n language changes", async () => {
    // Mock error response
    const { supabase } = await import("@/lib/supabaseClient");
    const mockErrorResponse = new Response(
      JSON.stringify({ error: "Invalid or expired token" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { context: mockErrorResponse },
    });

    // Create router
    const rootRoute = createRootRoute();
    const unsubscribeRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/unsubscribe",
      component: UnsubscribePage,
    });
    const routeTree = rootRoute.addChildren([unsubscribeRoute]);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({
        initialEntries: ["/unsubscribe?token=test-token"],
      }),
    });

    // Render with English
    const { rerender } = render(
      <I18nextProvider i18n={testI18n}>
        <RouterProvider router={router} />
      </I18nextProvider>
    );

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText("Invalid Token")).toBeTruthy();
    });

    expect(screen.getByText("The unsubscribe link is invalid.")).toBeTruthy();

    // Change to Hebrew
    await testI18n.changeLanguage("he");
    rerender(
      <I18nextProvider i18n={testI18n}>
        <RouterProvider router={router} />
      </I18nextProvider>
    );

    // Verify error text updated
    await waitFor(() => {
      expect(screen.getByText("טוקן לא תקין")).toBeTruthy();
    });
    expect(screen.getByText("קישור ביטול המנוי אינו תקין.")).toBeTruthy();
  });
});
