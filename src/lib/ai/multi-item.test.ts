import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_ITEMS_PER_MESSAGE } from "../../../supabase/functions/_shared/ai/multi-item.ts";

const MIGRATION = "supabase/migrations/20261029160000_ai_text_intake_items.sql";

describe("multi-item cap", () => {
  it("uses the same cap in the intake RPC", () => {
    const sql = readFileSync(resolve(MIGRATION), "utf8");
    expect(sql).toContain(`-- MAX_ITEMS_PER_MESSAGE ${MAX_ITEMS_PER_MESSAGE}`);
    expect(sql).toContain(`jsonb_array_length(v_items) > ${MAX_ITEMS_PER_MESSAGE}`);
  });
});
