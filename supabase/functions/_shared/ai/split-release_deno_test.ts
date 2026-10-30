import { mayReleaseRecentTextUsage } from "./usage-gate.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const NOW = Date.parse("2026-10-30T10:00:00.000Z");

Deno.test("a text unit from the last minute can be released", () => {
  const row = {
    user_id: "user-a",
    kind: "text",
    created_at: "2026-10-30T09:59:30.000Z",
    released_at: null,
  };
  assert(mayReleaseRecentTextUsage(row, "user-a", NOW), "recent text");
});

Deno.test("an older unit, another kind, or another user is not released", () => {
  const recent = "2026-10-30T09:59:30.000Z";
  const old = "2026-10-30T09:58:00.000Z";
  assert(!mayReleaseRecentTextUsage({ user_id: "user-a", kind: "text", created_at: old, released_at: null }, "user-a", NOW), "older than a minute");
  assert(!mayReleaseRecentTextUsage({ user_id: "user-a", kind: "receipt", created_at: recent, released_at: null }, "user-a", NOW), "not text");
  assert(!mayReleaseRecentTextUsage({ user_id: "user-b", kind: "text", created_at: recent, released_at: null }, "user-a", NOW), "other user");
  assert(!mayReleaseRecentTextUsage({ user_id: "user-a", kind: "text", created_at: recent, released_at: recent }, "user-a", NOW), "already released");
});
