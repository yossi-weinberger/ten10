import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationsWorkflow = readFileSync(
  ".github/workflows/deploy-supabase-migrations.yml",
  "utf8",
);
const functionsWorkflow = readFileSync(
  ".github/workflows/deploy-supabase-functions.yml",
  "utf8",
);

describe("Supabase production deployment ordering", () => {
  it("serializes migration and function workflows through one concurrency group", () => {
    expect(migrationsWorkflow).toContain("group: supabase-production");
    expect(functionsWorkflow).toContain("group: supabase-production");
  });

  it("applies pending migrations before deploying changed functions", () => {
    const migrationStep = functionsWorkflow.indexOf(
      "supabase db push --linked --yes",
    );
    const functionStep = functionsWorkflow.indexOf(
      "bash supabase/scripts/deploy-changed-functions.sh",
    );

    expect(migrationStep).toBeGreaterThan(-1);
    expect(functionStep).toBeGreaterThan(migrationStep);
  });
});
