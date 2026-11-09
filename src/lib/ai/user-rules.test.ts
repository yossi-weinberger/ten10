import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { rpc },
}));

import { disableUserRule } from "./user-rules";

describe("disableUserRule", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("turns a rule off by name and type", async () => {
    rpc.mockResolvedValue({ data: { disabled: true }, error: null });

    await expect(disableUserRule("acme", "recognized-expense")).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith("disable_ai_user_rule", {
      p_name: "acme",
      p_type: "recognized-expense",
    });
  });

  it("reports a missing rule as a failure", async () => {
    rpc.mockResolvedValue({ data: { error: "NOT_FOUND" }, error: null });

    await expect(disableUserRule("acme", "exempt-income")).resolves.toBe(false);
  });
});
