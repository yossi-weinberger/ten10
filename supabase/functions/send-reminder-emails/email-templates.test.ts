import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EMAIL_TOKENS } from "../_shared/email-tokens.ts";
import { escapeHtml } from "../_shared/escape-html.ts";
import { getMonthlyEncouragement } from "./email-copy.ts";
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
    expect(html).toContain("יתרה לתרומה");
    expect(html).toContain("384.70 ₪");
    expect(html).toContain("כדאי לוודא שהוספת");
    expect(html).toContain("פינת החיזוק");
    expect(html).toContain("הביאו את כל המעשר אל בית האוצר");
    expect(html).toContain("מלאכי ג, י");
    expect(html).toContain('text-align: left;">מלאכי ג, י');
    expect(html).not.toContain("TN10-");
    expect(html).toContain("בואו תנסו אותי");
    expect(html).toContain(EMAIL_TOKENS.colors.outstandingBadge);
    expect(html).toContain(EMAIL_TOKENS.colors.encouragementSurface);
    expect(html).toContain("אפשר לייבא אותן בקלות מקובץ Excel");
    expect(html).not.toContain("border-right: 4px solid");
  });

  it("formats amounts with the user's default currency", () => {
    const html = generateReminderEmailHTML({
      ...baseData,
      currency: "USD",
    });
    expect(html).toContain("384.70 $");
    expect(html).not.toContain("₪");
    expect(
      generateReminderEmailSubject({
        ...baseData,
        language: "en",
        currency: "EUR",
      }),
    ).toContain("€384.70");
  });

  it("renders credit with a minus sign and calm mint emphasis", () => {
    const html = generateReminderEmailHTML({
      ...baseData,
      titheBalance: -384.7,
    });
    expect(html).toContain(">זכות</span>");
    expect(html).toContain("-384.70 ₪");
    expect(html).toContain(EMAIL_TOKENS.colors.creditSurface);
    expect(html).toContain(EMAIL_TOKENS.colors.creditBadge);
  });

  it("renders the settled state", () => {
    const html = generateReminderEmailHTML({
      ...baseData,
      titheBalance: 0,
    });
    expect(html).toContain(">מאוזן</span>");
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
    expect(html).toContain("Due to give");
    expect(html).toContain("₪384.70");
    expect(html).toContain('text-align: right;">Malachi 3:10');
    expect(text).toContain("Good evening, Yossi");
    expect(text).toContain("Stop monthly reminders");
  });

  it("renders English credit badge", () => {
    const html = generateReminderEmailHTML({
      ...baseData,
      language: "en",
      fullName: "Yossi Weinberger",
      titheBalance: -50,
      currency: "USD",
    });
    expect(html).toContain(">Credit</span>");
    expect(html).toContain("-$50.00");
    expect(html).toContain(EMAIL_TOKENS.colors.creditSurface);
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
    expect(html).toContain("יתרה לתרומה");
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

  it("uses the shared user-header gradient with cream fallback", () => {
    const html = generateReminderEmailHTML(baseData);
    expect(html).toContain("radial-gradient(circle at 105% -10%");
    expect(html).toContain("radial-gradient(circle at -5% 115%");
    expect(html).toContain("#f9f6eb");
    expect(html).not.toContain(EMAIL_TOKENS.headerBackgroundUrl);
  });

  it("uses the approved deep Ten10 teal", () => {
    const html = generateReminderEmailHTML(baseData);
    expect(html).toContain("#11676a");
    expect(html).not.toContain("#0d9488");
  });

  it("uses the exact approved design tokens", () => {
    const html = generateReminderEmailHTML(baseData);
    const fontStack = `font-family: ${EMAIL_TOKENS.fontFamily}`;

    expect(html).toContain(EMAIL_TOKENS.colors.teal);
    expect(html).toContain(EMAIL_TOKENS.colors.gold);
    expect(html).toContain(EMAIL_TOKENS.colors.cream);
    expect(html).toContain(EMAIL_TOKENS.colors.border);
    expect(html).toContain(EMAIL_TOKENS.logoUrl);
    expect(html).toContain(EMAIL_TOKENS.colors.userCard);
    expect(html).toContain(EMAIL_TOKENS.colors.userPage);
    expect(html).toContain("border-radius: 12px");
    expect(html).toContain(`box-shadow: ${EMAIL_TOKENS.cardShadow}`);
    expect(html).toContain(`box-shadow: ${EMAIL_TOKENS.buttonShadow}`);
    expect(html).not.toContain("#d9a441");
    expect(html).toContain(fontStack);
    expect(html).not.toContain("font-family: Arial, Helvetica, sans-serif");
    expect(html).toMatch(
      /background-image: radial-gradient\([^>]*>/,
    );
    expect(html).toContain(`border-bottom: 1px solid ${EMAIL_TOKENS.colors.border}`);
    expect(html).toMatch(
      /color: #11676a;[^>]*font-family: Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif;[^>]*font-size: 24px; font-weight: 500;[^>]*>ערב טוב, יוסי<\/td>/,
    );
  });

  it("preserves both unsubscribe actions", () => {
    const html = generateReminderEmailHTML(baseData);
    expect(html).toContain(baseData.unsubscribeUrls.reminderUrl);
    expect(html).toContain(baseData.unsubscribeUrls.allUrl);
    expect(html).toContain("הפסקת תזכורות חודשיות");
    expect(html).toContain("ביטול הרשמה");
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

  it("writes state and monthly previews when enabled", () => {
    if (process.env.WRITE_EMAIL_PREVIEWS !== "1") return;

    const outputDirectory = resolve("tmp/reminder-encouragement-previews");
    mkdirSync(outputDirectory, { recursive: true });

    const states = [
      { key: "outstanding", titheBalance: 384.7 },
      { key: "credit", titheBalance: -384.7 },
      { key: "settled", titheBalance: 0 },
    ] as const;

    for (const state of states) {
      writeFileSync(
        resolve(outputDirectory, `reminder-he-${state.key}.html`),
        `${generateReminderEmailHTML({
          ...baseData,
          titheBalance: state.titheBalance,
          israelMonth: 7,
        })}\n`,
        "utf8",
      );
      writeFileSync(
        resolve(outputDirectory, `reminder-en-${state.key}.html`),
        `${generateReminderEmailHTML({
          ...baseData,
          language: "en",
          fullName: "Yossi Weinberger",
          titheBalance: state.titheBalance,
          israelMonth: 7,
        })}\n`,
        "utf8",
      );
    }

    const monthLinks: string[] = [];

    for (let month = 1; month <= 12; month += 1) {
      const heEncouragement = getMonthlyEncouragement("he", month);
      const heHtml = generateReminderEmailHTML({
        ...baseData,
        israelMonth: month,
      });
      const enHtml = generateReminderEmailHTML({
        ...baseData,
        language: "en",
        fullName: "Yossi Weinberger",
        israelMonth: month,
      });
      const heFile = `reminder-he-m${String(month).padStart(2, "0")}.html`;
      const enFile = `reminder-en-m${String(month).padStart(2, "0")}.html`;
      writeFileSync(resolve(outputDirectory, heFile), `${heHtml}\n`, "utf8");
      writeFileSync(resolve(outputDirectory, enFile), `${enHtml}\n`, "utf8");
      monthLinks.push(`<tr>
        <td>${month}</td>
        <td><code>${escapeHtml(heEncouragement.contentId ?? "")}</code></td>
        <td><a href="${heFile}">עברית</a></td>
        <td><a href="${enFile}">English</a></td>
        <td dir="auto">${escapeHtml(heEncouragement.body.slice(0, 80))}…</td>
      </tr>`);
    }

    const indexHtml = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>Ten10 reminder email redesign previews</title>
  <style>
    body { font-family: Assistant, "Segoe UI", Arial, sans-serif; margin: 32px; background: #fdfbf4; color: #243834; }
    h1, h2 { color: #11676a; }
    table { width: 100%; border-collapse: collapse; background: #fff; margin-bottom: 28px; }
    th, td { border-bottom: 1px solid #e4dfd2; padding: 10px 12px; text-align: right; vertical-align: top; }
    th { color: #43514d; font-size: 13px; }
    a { color: #11676a; font-weight: 700; }
    code { font-size: 12px; }
    p { color: #596662; max-width: 720px; }
  </style>
</head>
<body>
  <h1>מייל תזכורת — תצוגה מקדימה</h1>
  <h2>מצבי יתרה</h2>
  <p>
    <a href="reminder-he-outstanding.html">חובה HE</a> ·
    <a href="reminder-he-credit.html">זכות HE</a> ·
    <a href="reminder-he-settled.html">מאוזן HE</a><br />
    <a href="reminder-en-outstanding.html">Due EN</a> ·
    <a href="reminder-en-credit.html">Credit EN</a> ·
    <a href="reminder-en-settled.html">Settled EN</a>
  </p>
  <h2>12 חודשי חיזוק</h2>
  <table>
    <thead>
      <tr><th>חודש</th><th>contentId</th><th>HE</th><th>EN</th><th>תחילת הטקסט</th></tr>
    </thead>
    <tbody>
      ${monthLinks.join("\n")}
    </tbody>
  </table>
</body>
</html>
`;
    writeFileSync(resolve(outputDirectory, "index.html"), indexHtml, "utf8");
    expect(monthLinks).toHaveLength(12);
  });
});
