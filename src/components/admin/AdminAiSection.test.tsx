// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminAiCounts, AdminAiSpend } from "@/lib/data-layer/aiAdmin.service";
import { AdminAiSection } from "@/components/admin/AdminAiSection";

const { fetchAdminAiCounts, fetchAdminAiSpend } = vi.hoisted(() => ({
  fetchAdminAiCounts: vi.fn<() => Promise<AdminAiCounts | null>>(),
  fetchAdminAiSpend: vi.fn<() => Promise<AdminAiSpend | null>>(),
}));

vi.mock("@/lib/data-layer/aiAdmin.service", () => ({
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
  users: [],
};

const spend: AdminAiSpend = {
  available: true,
  mixed: true,
  grain: "day",
  models: [
    { label: "anthropic/claude-sonnet-5", totalCost: 0.123, requestCount: 4, inputTokens: 1, outputTokens: 1 },
  ],
  days: [],
  modelBuckets: [],
  appBuckets: null,
  sources: { app: 0, eval: 0 },
};

describe("AdminAiSection", () => {
  afterEach(() => {
    cleanup();
    fetchAdminAiCounts.mockReset();
    fetchAdminAiSpend.mockReset();
  });

  it("shows counts when the spend request fails", async () => {
    fetchAdminAiCounts.mockResolvedValue(counts);
    fetchAdminAiSpend.mockRejectedValue(new Error("Failed to fetch"));

    render(<AdminAiSection />);

    expect(await screen.findByText("7")).toBeTruthy();
    expect(screen.getByText("ai.spendUnavailable")).toBeTruthy();
    expect(screen.queryByText("ai.loadFailed")).toBeNull();
  });

  it("shows spend when the counts request fails", async () => {
    fetchAdminAiCounts.mockRejectedValue(new Error("counts down"));
    fetchAdminAiSpend.mockResolvedValue(spend);

    render(<AdminAiSection />);

    expect(await screen.findByText("anthropic/claude-sonnet-5: $0.123 · 4")).toBeTruthy();
    expect(screen.getByText("ai.loadFailed")).toBeTruthy();
  });
});
