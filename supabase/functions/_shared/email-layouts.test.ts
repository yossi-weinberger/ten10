import { describe, expect, it } from "vitest";
import { extractSemanticContract } from "../_tests/email-semantic-contract.ts";
import { renderAdminEmailShell } from "./email-layout-admin.ts";
import { renderUserEmailShell } from "./email-layout-user.ts";
import { EMAIL_TOKENS } from "./email-tokens.ts";

const userBodyHtml = `<table role="presentation"><tr><td><p>שלום גוף</p><a href="https://ten10-app.com/action?x=1&amp;y=2">פתיחת Ten10</a></td></tr></table>`;
const adminBodyHtml = `<table role="presentation"><tr><td><p>Admin body</p><a href="https://ten10-app.com/admin">Open admin</a></td></tr></table>`;

function countOccurrences(value: string, search: string): number {
  return value.split(search).length - 1;
}

describe("shared email layout contracts", () => {
  it("exports the approved shared email tokens", () => {
    expect(EMAIL_TOKENS).toEqual({
      adminWidth: 800,
      colors: {
        border: "#ded9ca",
        cream: "#f9f6eb",
        gold: "#f0c000",
        mutedText: "#596662",
        surface: "#fffdf8",
        teal: "#11676a",
        text: "#243834",
      },
      fontFamily: "Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif",
      headerBackgroundUrl:
        "https://ten10-app.com/email/reminder-header-blur.png",
      logoUrl: "https://ten10-app.com/logo/logo-wide.png",
      userWidth: 600,
    });
  });

  it("renders the user shell with the supplied Hebrew layout contract", () => {
    const html = renderUserEmailShell({
      bodyHtml: userBodyHtml,
      dir: "rtl",
      headerSlogan: "סלוגן קיים",
      lang: "he",
    });

    expect(html).toContain('lang="he"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("max-width: 600px");
    expect(html).toContain("radial-gradient(circle at 105% -10%");
    expect(html).toContain("radial-gradient(circle at -5% 115%");
    expect(html).toContain(`background-color: ${EMAIL_TOKENS.colors.cream}`);
    expect(html).toContain("#f7f3e7");
    expect(html).toContain(EMAIL_TOKENS.logoUrl);
    expect(html).toContain('width="142"');
    expect(html).toContain('alt="Ten10"');
    expect(html).toContain("סלוגן קיים");
    expect(html).not.toContain(`background-color: ${EMAIL_TOKENS.colors.teal}`);
    expect(countOccurrences(html, userBodyHtml)).toBe(1);

    const contract = extractSemanticContract(html);
    expect(contract.orderedText).toEqual(["סלוגן קיים", "שלום גוף", "פתיחת Ten10"]);
    expect(contract.links).toEqual([
      {
        href: "https://ten10-app.com/action?x=1&y=2",
        text: "פתיחת Ten10",
      },
    ]);
  });

  it("renders the admin shell with the compact English layout contract", () => {
    const html = renderAdminEmailShell({
      bodyHtml: adminBodyHtml,
      dir: "ltr",
      headerSlogan: "DAILY OPERATIONS",
      lang: "en",
    });

    expect(html).toContain('lang="en"');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain("max-width: 800px");
    expect(html).toContain("padding: 17px 22px");
    expect(html).toContain("padding: 22px");
    expect(html).toContain('width="112"');
    expect(html).toContain("#f4f3ed");
    expect(html).toContain("border-bottom: 3px solid #f0c000");
    expect(html).toContain("radial-gradient(circle at 100% 0%");
    expect(html).toContain(EMAIL_TOKENS.logoUrl);
    expect(html).toContain(EMAIL_TOKENS.colors.gold);
    expect(html).toContain(EMAIL_TOKENS.fontFamily);
    expect(html).toContain("Ten10 Operations");
    expect(html).toContain("Automated internal email");
    expect(html).toContain('align="right"');
    expect(html).toContain("text-align: right");
    expect(countOccurrences(html, adminBodyHtml)).toBe(1);

    const contract = extractSemanticContract(html);
    expect(contract.orderedText).toEqual([
      "DAILY OPERATIONS",
      "Admin body",
      "Open admin",
      "Ten10 Operations",
      "Automated internal email",
    ]);
    expect(contract.links).toEqual([
      {
        href: "https://ten10-app.com/admin",
        text: "Open admin",
      },
    ]);
  });

  it("left-aligns admin header meta for Hebrew RTL emails", () => {
    const html = renderAdminEmailShell({
      bodyHtml: adminBodyHtml,
      dir: "rtl",
      headerSlogan: "CONTACT · HALACHA",
      lang: "he",
    });

    expect(html).toContain('dir="rtl"');
    expect(html).toContain("CONTACT · HALACHA");
    expect(html).toContain('align="left"');
    expect(html).toContain("text-align: left");
    expect(html).toContain("direction: ltr;");
  });
});
