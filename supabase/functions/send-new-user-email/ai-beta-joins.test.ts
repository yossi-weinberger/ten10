import { describe, expect, it } from "vitest";
import { buildEmailBodies, type BuildEmailBodiesInput } from "./email-template.ts";
import { buildAiBetaJoins } from "./ai-beta-joins.ts";

const baseInput: BuildEmailBodiesInput = {
  aiBeta: { joins: [], total: 0, windowCount: 0 },
  downloadRequests: { details: [], total: 0, windowCount: 0 },
  github: { last24h: null, latestDownloads: null, latestVersion: "—", totalDownloads: null },
  hours: 24,
  reminderLogs: [],
  rows: [],
  totalUsers: 1,
};

describe("AI beta join lookups", () => {
  it("renders unknown when a lookup fails", async () => {
    const joins = await buildAiBetaJoins(
      [{ user_id: "user-1", beta_terms_accepted_at: "2026-07-16T10:30:00.000Z" }],
      () => Promise.reject(new Error("auth down")),
      new Map(),
    );
    const rendered = buildEmailBodies({
      ...baseInput,
      aiBeta: { joins, total: 1, windowCount: 1 },
    });

    expect(joins[0]?.email).toBeNull();
    expect(rendered.htmlBody).toContain("unknown");
    expect(rendered.textBody).toContain("| unknown |");
    expect(rendered.htmlBody).not.toContain("auth down");
    expect(rendered.textBody).not.toContain("auth down");
  });

  it("looks up only the first 50 joins and keeps their order", async () => {
    const accepted = Array.from({ length: 51 }, (_, index) => ({
      user_id: `user-${index}`,
      beta_terms_accepted_at: "2026-07-16T10:30:00.000Z",
    }));
    const seen: string[] = [];
    const joins = await buildAiBetaJoins(
      accepted,
      (userId) => {
        seen.push(userId);
        return Promise.resolve({ email: `${userId}@example.test`, metaName: null });
      },
      new Map(),
    );

    expect(joins).toHaveLength(50);
    expect(joins[0]?.email).toBe("user-0@example.test");
    expect(joins[49]?.email).toBe("user-49@example.test");
    expect(seen).not.toContain("user-50");
  });
});
