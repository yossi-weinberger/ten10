// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminAiCalls, AdminAiCounts, AdminAiSpend } from "@/lib/data-layer/aiAdmin.service";
import { AdminAiSection } from "@/components/admin/AdminAiSection";

const { fetchAdminAiCalls, fetchAdminAiCounts, fetchAdminAiSpend } = vi.hoisted(() => ({
  fetchAdminAiCalls: vi.fn<() => Promise<AdminAiCalls | null>>(),
  fetchAdminAiCounts: vi.fn<() => Promise<AdminAiCounts | null>>(),
  fetchAdminAiSpend: vi.fn<() => Promise<AdminAiSpend | null>>(),
}));

vi.mock("@/lib/data-layer/aiAdmin.service", () => ({
  fetchAdminAiCalls: () => fetchAdminAiCalls(),
  fetchAdminAiCounts: () => fetchAdminAiCounts(),
  fetchAdminAiSpend: () => fetchAdminAiSpend(),
}));

vi.mock("@/hooks/useDateControls", () => ({
  useDateControls: () => ({
    dateRangeSelection: "month",
    setDateRangeSelection: () => undefined,
    activeDateRangeObject: { startDate: "2026-10-01", endDate: "2026-10-23", label: "month" },
    dateRangeLabels: { month: "month", year: "year", all: "all", custom: "custom" },
    customDateRange: undefined,
    setCustomDateRange: () => undefined,
  }),
}));

vi.mock("@/components/ui/date-range-picker", () => ({
  DatePickerWithRange: () => <button type="button">custom</button>,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => "rtl", language: "he" },
  }),
}));

const counts: AdminAiCounts = {
  from: "2026-10-17",
  to: "2026-10-23",
  grain: "day",
  first_on: "2026-10-16",
  drafts: { ready: 0, needs_review: 0, approved: 0, rejected: 1, committed: 7, reverted: 0 },
  messages_by_kind: {},
  origins: { ai: 2, ai_auto: 0 },
  receipt_links: 0,
  artifacts: { active: 0, deleted: 0 },
  rules_active: 0,
  questions: 3,
  question_outcomes: {},
  buckets: [],
  usage: {
    ai_transactions: 14,
    ai_auto_transactions: 0,
    all_transactions: 16,
    ai_transaction_users: 2,
    ai_users: 2,
    message_senders: 2,
  },
  users: [],
};

const spend: AdminAiSpend = {
  available: true,
  mixed: true,
  models: [
    { label: "anthropic/claude-sonnet-5", totalCost: 0.123, requestCount: 4, inputTokens: 1, outputTokens: 1 },
  ],
  appDays: [{ day: "2026-10-28", totalCost: 0.0075, requestCount: 23 }],
  sources: { app: 0.0075, eval: 0 },
};

const calls: AdminAiCalls = {
  first_on: "2026-10-28",
  operations: [
    {
      operation: "speech",
      calls: 3,
      failed: 3,
      p50_ms: 397,
      p95_ms: 500,
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: 0,
      top_error: "http_4xx",
    },
  ],
  days: [{ day: "2026-10-28", calls: 23, cost_usd: 0.0073625 }],
  model_buckets: [],
  users: [{ email: "qa@example.com", calls: 23, failed: 3, cost_usd: 0.0073625 }],
};

describe("AdminAiSection", () => {
  beforeEach(() => {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    });
    fetchAdminAiCalls.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    fetchAdminAiCounts.mockReset();
    fetchAdminAiSpend.mockReset();
    fetchAdminAiCalls.mockReset();
  });

  it("shows counts when the spend request fails", async () => {
    fetchAdminAiCounts.mockResolvedValue(counts);
    fetchAdminAiSpend.mockRejectedValue(new Error("Failed to fetch"));

    render(<TooltipProvider><AdminAiSection /></TooltipProvider>);

    expect(await screen.findByText("ai.usage.transactions")).toBeTruthy();
    expect(screen.getByText("ai.usage.users")).toBeTruthy();
    expect(screen.getByText("ai.usage.share")).toBeTruthy();
    expect(screen.getByText("ai.usage.messages")).toBeTruthy();
    expect(screen.getByText("ai.spendUnavailable")).toBeTruthy();
    expect(screen.queryByText("ai.loadFailed")).toBeNull();
  });

  it("shows spend when the counts request fails", async () => {
    fetchAdminAiCounts.mockRejectedValue(new Error("counts down"));
    fetchAdminAiSpend.mockResolvedValue(spend);

    render(<TooltipProvider><AdminAiSection /></TooltipProvider>);

    expect(await screen.findByText("Claude")).toBeTruthy();
    expect(screen.getByText("$0.123")).toBeTruthy();
    expect(screen.getByText("ai.loadFailed")).toBeTruthy();
  });

  it("keeps the draft funnel collapsed until it is opened", async () => {
    fetchAdminAiCounts.mockResolvedValue(counts);
    fetchAdminAiSpend.mockResolvedValue(null);

    render(<TooltipProvider><AdminAiSection /></TooltipProvider>);

    const trigger = await screen.findByRole("button", { name: /ai.transactionsTitle/ });
    expect(trigger.getAttribute("data-state")).toBe("closed");
    expect(screen.queryByText("ai.funnelCreated")).toBeNull();
    fireEvent.click(trigger);
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(screen.getByText("ai.funnelCreated")).toBeTruthy();
  });
  it("shows model calls and the daily comparison with the gateway", async () => {
    fetchAdminAiCounts.mockResolvedValue(counts);
    fetchAdminAiSpend.mockResolvedValue(spend);
    fetchAdminAiCalls.mockResolvedValue(calls);

    render(<TooltipProvider><AdminAiSection /></TooltipProvider>);

    expect(await screen.findByText("ai.calls.title")).toBeTruthy();
    expect(screen.getByText("ai.calls.operations.speech")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText("(http_4xx)")).toBeTruthy();
    expect(screen.getByText("2026-10-28")).toBeTruthy();
    expect(screen.getByText("$0.00014")).toBeTruthy();
    expect(screen.getByText("qa@example.com")).toBeTruthy();
  });

  it("keeps the rest of the tab when the calls request fails", async () => {
    fetchAdminAiCounts.mockResolvedValue(counts);
    fetchAdminAiSpend.mockResolvedValue(spend);
    fetchAdminAiCalls.mockRejectedValue(new Error("calls down"));

    render(<TooltipProvider><AdminAiSection /></TooltipProvider>);

    expect(await screen.findByText("Claude")).toBeTruthy();
    expect(screen.getByText("ai.usage.transactions")).toBeTruthy();
    expect(screen.queryByText("ai.calls.title")).toBeNull();
  });
});