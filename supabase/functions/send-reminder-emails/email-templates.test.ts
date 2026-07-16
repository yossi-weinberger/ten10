import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractFirstName,
  generateReminderEmailHTML,
  generateReminderEmailSubject,
  generateReminderEmailText,
  getBalanceState,
} from "./email-templates.ts";

const baseData = {
  titheBalance: 384.7,
  maaserBalance: 384.7,
  chomeshBalance: 0,
  language: "he" as const,
  fullName: "יוסי ויינברגר",
  israelMonth: 1,
  unsubscribeUrls: {
    reminderUrl: "https://ten10-app.com/unsubscribe?type=reminder",
    allUrl: "https://ten10-app.com/unsubscribe?type=all",
  },
};
const hostedHeaderAssetUrl =
  "https://ten10-app.com/email/reminder-header-blur.png";
const invalidHeaderAssetUrl =
  "https://invalid.example.test/email/reminder-header-blur.png";

describe("reminder email templates", () => {
  it("classifies all balance states", () => {
    expect(getBalanceState(1)).toBe("outstanding");
    expect(getBalanceState(-1)).toBe("credit");
    expect(getBalanceState(0)).toBe("settled");
  });

  it("extracts only a trimmed first name", () => {
    expect(extractFirstName("  יוסי   ויינברגר ")).toBe("יוסי");
    expect(extractFirstName(null)).toBeUndefined();
    expect(extractFirstName("   ")).toBeUndefined();
  });

  it("renders the approved Hebrew outstanding copy", () => {
    const html = generateReminderEmailHTML(baseData);
    expect(html).toContain('lang="he"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("ערב טוב, יוסי");
    expect(html).toContain("יתרת המעשר שלך לתרומה היא");
    expect(html).toContain("384.70");
    expect(html).toContain("כדאי לוודא שהוספת");
    expect(html).toContain("פינת החיזוק");
  });

  it("renders credit without a minus sign", () => {
    const html = generateReminderEmailHTML({
      ...baseData,
      titheBalance: -384.7,
    });
    expect(html).toContain("הינך נמצא בזכות של");
    expect(html).toContain("384.70");
    expect(html).not.toContain("-384.70");
  });

  it("renders the settled state", () => {
    const html = generateReminderEmailHTML({
      ...baseData,
      titheBalance: 0,
    });
    expect(html).toContain("יתרת המעשר שלך מאוזנת");
    expect(html).toContain("0.00");
  });

  it("renders complete English HTML and plain text", () => {
    const data = {
      ...baseData,
      language: "en" as const,
      fullName: "Yossi Weinberger",
    };
    const html = generateReminderEmailHTML(data);
    const text = generateReminderEmailText(data);
    expect(html).toContain('lang="en"');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain("Good evening, Yossi");
    expect(html).toContain("Your remaining tithe balance is");
    expect(text).toContain("Good evening, Yossi");
    expect(text).toContain("Stop monthly reminders");
  });

  it("renders complete HTML and plain text without a name", () => {
    const data = {
      ...baseData,
      fullName: null,
    };
    const html = generateReminderEmailHTML(data);
    const text = generateReminderEmailText(data);

    expect(html).toContain(">ערב טוב</td>");
    expect(html).not.toContain("ערב טוב,");
    expect(html).toContain("יתרת המעשר שלך לתרומה היא");
    expect(html).toContain("פינת החיזוק");
    expect(text).toContain("ערב טוב");
    expect(text).not.toContain("ערב טוב,");
    expect(text).toContain("הפסקת תזכורות חודשיות");
  });

  it("escapes a user-controlled name", () => {
    const html = generateReminderEmailHTML({
      ...baseData,
      fullName: '<img src=x onerror="alert(1)"> User',
    });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });

  it("escapes user-controlled unsubscribe URLs", () => {
    const html = generateReminderEmailHTML({
      ...baseData,
      unsubscribeUrls: {
        reminderUrl: 'https://ten10-app.com/unsubscribe?type=reminder&next="x"',
        allUrl: "https://ten10-app.com/unsubscribe?type=all&next=<script>",
      },
    });
    expect(html).toContain("&amp;next=&quot;x&quot;");
    expect(html).toContain("&amp;next=&lt;script&gt;");
    expect(html).not.toContain('next="x"');
    expect(html).not.toContain("next=<script>");
  });

  it("contains the hosted header asset and cream fallback", () => {
    const html = generateReminderEmailHTML(baseData);
    expect(html).toContain(
      "https://ten10-app.com/email/reminder-header-blur.png",
    );
    expect(html).toContain("#f9f6eb");
  });

  it("uses the approved deep Ten10 teal", () => {
    const html = generateReminderEmailHTML(baseData);
    expect(html).toContain("#11676a");
    expect(html).not.toContain("#0d9488");
  });

  it("uses the exact approved design tokens", () => {
    const html = generateReminderEmailHTML(baseData);
    const fontStack =
      "font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif";

    expect(html).toContain("#11676a");
    expect(html).toContain("#f0c000");
    expect(html).not.toContain("#d9a441");
    expect(html).toContain(fontStack);
    expect(html).not.toContain("font-family: Arial, Helvetica, sans-serif");
    expect(html).toMatch(
      /border-bottom: 1px solid #[0-9a-f]{6}[^>]*background-image:/,
    );
    expect(html).toMatch(
      /color: #11676a;[^>]*font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif;[^>]*font-size: 24px; font-weight: 500;[^>]*>ערב טוב, יוסי<\/td>/,
    );
  });

  it("preserves both unsubscribe actions", () => {
    const html = generateReminderEmailHTML(baseData);
    expect(html).toContain(baseData.unsubscribeUrls.reminderUrl);
    expect(html).toContain(baseData.unsubscribeUrls.allUrl);
    expect(html).toContain("הפסקת תזכורות חודשיות");
    expect(html).toContain("ביטול הרשמה מכל המיילים");
  });

  it("localizes subject lines", () => {
    expect(generateReminderEmailSubject(baseData)).toContain("תזכורת מעשר");
    expect(
      generateReminderEmailSubject({
        ...baseData,
        language: "en",
      }),
    ).toContain("Tithe reminder");
  });

});

if (process.env.WRITE_EMAIL_PREVIEWS === "1") {
  it("writes the manual inspection fixture matrix", () => {
    const outputDirectory = resolve("tmp/reminder-email-previews");
    mkdirSync(outputDirectory, { recursive: true });

    const fixtures = [
      ["reminder-he-outstanding.html", baseData],
      ["reminder-he-credit.html", { ...baseData, titheBalance: -384.7 }],
      ["reminder-he-settled.html", { ...baseData, titheBalance: 0 }],
      [
        "reminder-en-outstanding.html",
        { ...baseData, language: "en" as const, fullName: "Yossi Weinberger" },
      ],
      ["reminder-no-name.html", { ...baseData, fullName: null }],
      [
        "reminder-long-name.html",
        {
          ...baseData,
          language: "en" as const,
          fullName:
            "Alexandria-Cassandra Montgomery-Worthington the Third",
        },
      ],
    ] as const;

    for (const [filename, data] of fixtures) {
      writeFileSync(
        resolve(outputDirectory, filename),
        generateReminderEmailHTML(data),
        "utf8",
      );
    }
  });

  it("writes the image fallback fixture while narrow viewport inspection remains manual", () => {
    const outputDirectory = resolve("tmp/reminder-email-previews");
    mkdirSync(outputDirectory, { recursive: true });
    const fixtureHtml = generateReminderEmailHTML({
      ...baseData,
      fullName: null,
    }).replaceAll(hostedHeaderAssetUrl, invalidHeaderAssetUrl);

    expect(fixtureHtml).toContain(invalidHeaderAssetUrl);
    expect(fixtureHtml).not.toContain(hostedHeaderAssetUrl);
    expect(fixtureHtml).toContain("#f9f6eb");

    writeFileSync(
      resolve(outputDirectory, "reminder-image-fallback-mobile.html"),
      fixtureHtml,
      "utf8",
    );
  });
}
