import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  ".github/workflows/deploy-supabase-production.yml",
  "utf8",
);

describe("Supabase production deployment ordering", () => {
  it("uses one workflow so a queued run cannot cancel a sibling deploy", () => {
    expect(existsSync(".github/workflows/deploy-supabase-migrations.yml")).toBe(false);
    expect(existsSync(".github/workflows/deploy-supabase-functions.yml")).toBe(false);
    expect(workflow).toContain("group: supabase-production");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("needs: migrate");
  });

  it("applies pending migrations before deploying changed functions", () => {
    const migrationStep = workflow.indexOf("supabase db push --linked --yes");
    const functionStep = workflow.indexOf(
      "bash supabase/scripts/deploy-changed-functions.sh",
    );

    expect(migrationStep).toBeGreaterThan(-1);
    expect(functionStep).toBeGreaterThan(migrationStep);
  });
});
