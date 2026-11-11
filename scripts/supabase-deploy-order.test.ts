import { existsSync, readdirSync, readFileSync } from "node:fs";
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

  it("ensures all AI migrations are chronologically sequenced after main's last migration", () => {
    const files = readdirSync("supabase/migrations")
      .filter((file) => file.endsWith(".sql"))
      .sort();

    const MAIN_LAST_MIGRATION_TIMESTAMP = "20261019195400";
    const mainLastIndex = files.findIndex((f) => f.startsWith(MAIN_LAST_MIGRATION_TIMESTAMP));
    expect(mainLastIndex).toBeGreaterThan(-1);

    // Verify chronological order of all files
    let prevTimestamp = "";
    for (const file of files) {
      const match = file.match(/^(\d{8,14})_/);
      expect(match, `Migration ${file} must have a valid timestamp prefix`).not.toBeNull();
      const timestamp = match![1];
      if (prevTimestamp) {
        expect(
          timestamp >= prevTimestamp,
          `Migration ${file} (${timestamp}) must be chronologically >= previous (${prevTimestamp})`,
        ).toBe(true);
      }
      prevTimestamp = timestamp;
    }

    // Verify that every single AI intake migration is strictly after main's last migration timestamp
    const aiMigrations = files.filter((f) => f.includes("_ai_"));
    expect(aiMigrations.length).toBeGreaterThan(0);

    for (const aiMigration of aiMigrations) {
      const match = aiMigration.match(/^(\d{8,14})_/);
      expect(match).not.toBeNull();
      const timestamp = match![1];
      expect(
        timestamp > MAIN_LAST_MIGRATION_TIMESTAMP,
        `AI migration ${aiMigration} (${timestamp}) must be strictly after main's last migration (${MAIN_LAST_MIGRATION_TIMESTAMP})`,
      ).toBe(true);
    }

    expect(aiMigrations).toEqual([
      "20261103100000_ai_intake.sql",
      "20261110100000_ai_plans.sql",
      "20261110120000_admin_ai_user_plans.sql",
      "20261111002200_ai_beta_consents.sql",
    ]);
  });
});

