import { describe, expect, it } from "vitest";
import { extractSemanticContract } from "../_tests/email-semantic-contract.ts";
import {
  generateAlertEmailHTML,
  generateAlertEmailSubject,
  generateAlertEmailText,
  type CronJobFailure,
} from "./email-template.ts";

const headerSlogan = "CRON ALERTS";
const adminFooter = ["Ten10 Operations", "Automated internal email"] as const;

const singleFailure: CronJobFailure = {
  duration_seconds: 12,
  end_time: "2026-07-16T09:00:12.000Z",
  jobid: 1,
  jobname: "nightly_rollup",
  return_message: "Worker exited with status 1",
  runid: 101,
  start_time: "2026-07-16T09:00:00.000Z",
  status: "failed",
};

const multipleFailures: CronJobFailure[] = [
  singleFailure,
  {
    duration_seconds: 30,
    end_time: "2026-07-16T10:15:30.000Z",
    jobid: 2,
    jobname: "billing_sync",
    return_message: "timeout",
    runid: 102,
    start_time: "2026-07-16T10:15:00.000Z",
    status: "error",
  },
];

const expectedSingleTime = new Date(singleFailure.start_time).toLocaleString();
const expectedSecondTime = new Date(
  multipleFailures[1].start_time,
).toLocaleString();

describe("cron failure alert email template", () => {
  it("renders the exact production subject", () => {
    expect(generateAlertEmailSubject(multipleFailures)).toBe(
      "[Ten10 Alert] 2 Cron Job Failure(s) Detected",
    );
  });

  it("preserves the one-failure Hebrew HTML contract and English text body", () => {
    const html = generateAlertEmailHTML([singleFailure]);
    const text = generateAlertEmailText([singleFailure]);

    expect(text).toBe(`Cron Job Failures Alert

Found 1 failure(s) in the last 24 hours:

- nightly_rollup: failed - Worker exited with status 1 at ${expectedSingleTime}

Check Supabase Dashboard → Database → Cron Jobs for details.
`);
    expect(extractSemanticContract(html)).toEqual({
      links: [],
      orderedText: [
        headerSlogan,
        "⚠️ התראות על כשלונות CRON Jobs",
        "נמצאו 1 כשלונות ב-24 השעות האחרונות",
        "שם ה-Job",
        "סטטוס",
        "הודעה",
        "זמן",
        "nightly_rollup",
        "failed",
        "Worker exited with status 1",
        expectedSingleTime,
        "לבדיקה מפורטת, לך ל-Supabase Dashboard → Database → Cron Jobs",
        ...adminFooter,
      ],
    });
    expect(html).toContain('lang="he"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("max-width: 800px");
  });

  it("preserves zero and multiple failure count wording", () => {
    expect(generateAlertEmailText([])).toBe(`Cron Job Failures Alert

Found 0 failure(s) in the last 24 hours:



Check Supabase Dashboard → Database → Cron Jobs for details.
`);
    expect(extractSemanticContract(generateAlertEmailHTML([])).orderedText).toEqual([
      headerSlogan,
      "⚠️ התראות על כשלונות CRON Jobs",
      "נמצאו 0 כשלונות ב-24 השעות האחרונות",
      "שם ה-Job",
      "סטטוס",
      "הודעה",
      "זמן",
      "לבדיקה מפורטת, לך ל-Supabase Dashboard → Database → Cron Jobs",
      ...adminFooter,
    ]);

    const html = generateAlertEmailHTML(multipleFailures);
    const text = generateAlertEmailText(multipleFailures);

    expect(text).toBe(`Cron Job Failures Alert

Found 2 failure(s) in the last 24 hours:

- nightly_rollup: failed - Worker exited with status 1 at ${expectedSingleTime}
- billing_sync: error - timeout at ${expectedSecondTime}

Check Supabase Dashboard → Database → Cron Jobs for details.
`);
    expect(extractSemanticContract(html).orderedText).toEqual([
      headerSlogan,
      "⚠️ התראות על כשלונות CRON Jobs",
      "נמצאו 2 כשלונות ב-24 השעות האחרונות",
      "שם ה-Job",
      "סטטוס",
      "הודעה",
      "זמן",
      "nightly_rollup",
      "failed",
      "Worker exited with status 1",
      expectedSingleTime,
      "billing_sync",
      "error",
      "timeout",
      expectedSecondTime,
      "לבדיקה מפורטת, לך ל-Supabase Dashboard → Database → Cron Jobs",
      ...adminFooter,
    ]);
  });

  it("escapes dynamic HTML while preserving decoded visible failure details", () => {
    const unsafe = `"<img src=x onerror='alert(1)'>"`;
    const failure: CronJobFailure = {
      duration_seconds: 1,
      end_time: "2026-07-16T09:00:01.000Z",
      jobid: 3,
      jobname: `job ${unsafe}`,
      return_message: `message ${unsafe}`,
      runid: 103,
      start_time: "2026-07-16T09:00:00.000Z",
      status: `status ${unsafe}`,
    };
    const html = generateAlertEmailHTML([failure]);
    const contract = extractSemanticContract(html);

    expect(contract.orderedText).toContain(`job ${unsafe}`);
    expect(contract.orderedText).toContain(`status ${unsafe}`);
    expect(contract.orderedText).toContain(`message ${unsafe}`);
    expect(html).not.toContain(unsafe);
    expect(html).not.toContain(`job ${unsafe}`);
    expect(html).not.toContain(`status ${unsafe}`);
    expect(html).not.toContain(`message ${unsafe}`);
    expect(html).toContain(
      "job &quot;&lt;img src=x onerror=&#39;alert(1)&#39;&gt;&quot;",
    );
    expect(html).toContain(new Date(failure.start_time).toLocaleString());
  });

  it("rejects added, reordered, and row-content mutations", () => {
    const html = generateAlertEmailHTML(multipleFailures);
    const expectedContract = {
      links: [],
      orderedText: [
        headerSlogan,
        "⚠️ התראות על כשלונות CRON Jobs",
        "נמצאו 2 כשלונות ב-24 השעות האחרונות",
        "שם ה-Job",
        "סטטוס",
        "הודעה",
        "זמן",
        "nightly_rollup",
        "failed",
        "Worker exited with status 1",
        expectedSingleTime,
        "billing_sync",
        "error",
        "timeout",
        expectedSecondTime,
        "לבדיקה מפורטת, לך ל-Supabase Dashboard → Database → Cron Jobs",
        ...adminFooter,
      ],
    };
    const addedHebrew = html.replace(
      "⚠️ התראות על כשלונות CRON Jobs",
      "⚠️ התראות על כשלונות CRON Jobs<p>טקסט חדש</p>",
    );
    const reorderedHebrew = html
      .replace("שם ה-Job", "__JOB_NAME__")
      .replace("סטטוס", "שם ה-Job")
      .replace("__JOB_NAME__", "סטטוס");
    const changedRow = html.replace("billing_sync", "billing_sync_changed");

    expect(extractSemanticContract(html)).toEqual(expectedContract);
    for (const mutation of [addedHebrew, reorderedHebrew, changedRow]) {
      expect(mutation).not.toBe(html);
      expect(extractSemanticContract(mutation)).not.toEqual(expectedContract);
    }
  });
});
