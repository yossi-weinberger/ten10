import { describe, expect, it } from "vitest";
import { EMAIL_TOKENS } from "../_shared/email-tokens.ts";
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
    expect(html).toContain("יתרת המעשר שלך לתרומה היא");
    expect(html).toContain("384.70 ₪");
    expect(html).toContain("כדאי לוודא שהוספת");
    expect(html).toContain("פינת החיזוק");
    expect(html).toContain("border-right: 4px solid");
    expect(html).toContain("אפשר לייבא אותן בקלות מקובץ Excel");
    expect(html).not.toContain("#e8f3ee");
    expect(html).not.toContain("#d7ebe2");
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

  it("renders credit without a minus sign and with A+B emphasis", () => {
    const html = generateReminderEmailHTML({
      ...baseData,
      titheBalance: -384.7,
    });
    expect(html).toContain("הינך נמצא בזכות של");
    expect(html).toContain("384.70 ₪");
    expect(html).not.toContain("-384.70");
    expect(html).toContain(">זכות</span>");
    expect(html).toContain("#e8f3ee");
    expect(html).toContain("#d7ebe2");
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
    expect(html).toContain("₪384.70");
    expect(html).toContain("border-left: 4px solid");
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
    expect(html).toContain("$50.00");
    expect(html).toContain("#e8f3ee");
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
    expect(html).toContain("#f7f3e7");
    expect(html).toContain("#e9e7df");
    expect(html).toContain("border-radius: 8px");
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
