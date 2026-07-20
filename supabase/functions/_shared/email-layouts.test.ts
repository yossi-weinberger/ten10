import { describe, expect, it } from "vitest";
import { extractSemanticContract } from "../_tests/email-semantic-contract.ts";
import {
  renderAdminBadge,
  renderAdminTd,
  renderAdminTh,
  renderGoldAccentCallout,
} from "./email-admin-primitives.ts";
import { renderAdminEmailShell } from "./email-layout-admin.ts";
import { renderUserEmailShell } from "./email-layout-user.ts";
import { EMAIL_TOKENS } from "./email-tokens.ts";
import { escapeHtml } from "./escape-html.ts";

const userBodyHtml = `<table role="presentation"><tr><td><p>שלום גוף</p><a href="https://ten10-app.com/action?x=1&amp;y=2">פתיחת Ten10</a></td></tr></table>`;
const adminBodyHtml = `<table role="presentation"><tr><td><p>Admin body</p><a href="https://ten10-app.com/admin">Open admin</a></td></tr></table>`;

function countOccurrences(value: string, search: string): number {
  return value.split(search).length - 1;
}

describe("shared email layout contracts", () => {
  it("exports the approved shared email tokens", () => {
    expect(EMAIL_TOKENS).toEqual({
      adminHeaderBackgroundImage:
        "radial-gradient(circle at 100% 0%, rgba(17,103,106,.20), transparent 50%)",
      adminWidth: 800,
      colors: {
        adminFooter: "#e9eae4",
        adminFooterText: "#727b78",
        adminLabel: "#43514d",
        adminMeta: "#68736f",
        adminMetricBorder: "#d6d9d1",
        adminPage: "#f4f3ed",
        adminRowBorder: "#e0ddd2",
        adminTitle: "#173e3e",
        adminValue: "#53615e",
        balanceCard: "#ffffff",
        bodyLight: "#6b7471",
        bodyMuted: "#4a5955",
        border: "#ded9ca",
        buttonText: "#fffdf8",
        cream: "#f9f6eb",
        creditBadge: "#d7ebe2",
        creditBorder: "#b7d4c6",
        creditSurface: "#e8f3ee",
        dangerSurface: "#fee2e2",
        dangerText: "#991b1b",
        encouragementSurface: "#edf4f0",
        gold: "#f0c000",
        mutedText: "#596662",
        outstandingBadge: "#f0c000",
        outstandingBadgeText: "#243834",
        successSurface: "#e0eee9",
        surface: "#fffdf8",
        teal: "#11676a",
        text: "#243834",
        userBody: "#fffcf7",
        userCard: "#f6f3ea",
        userCardBorder: "#e4dfd2",
        userFooter: "#f0ebe0",
        userPage: "#fdfbf4",
        warnSurface: "#fef3c7",
        warnText: "#92400e",
      },
      buttonShadow: "0 4px 14px rgba(17, 103, 106, 0.28)",
      cardShadow: "0 2px 10px rgba(36, 56, 52, 0.07)",
      fontFamily: "Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif",
      headerBackgroundUrl:
        "https://ten10-app.com/email/reminder-header-blur.png",
      logoUrl: "https://ten10-app.com/logo/logo-wide.png",
      userHeaderBackgroundImage:
        "radial-gradient(circle at 105% -10%, rgba(17,103,106,.26), transparent 46%), radial-gradient(circle at -5% 115%, rgba(240,192,0,.31), transparent 42%)",
      userWidth: 600,
    });
  });

  it("escapes HTML entities for email content", () => {
    expect(escapeHtml(`<a href="x">a&b</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;a&amp;b&lt;/a&gt;",
    );
  });

  it("renders admin table primitives with shared tones", () => {
    expect(renderAdminBadge("Yes", "ok")).toContain(
      EMAIL_TOKENS.colors.successSurface,
    );
    expect(renderAdminTh("Email")).toContain(
      `border-bottom: 2px solid ${EMAIL_TOKENS.colors.teal}`,
    );
    expect(renderAdminTd("value", { emphasis: true })).toContain(
      "font-weight: 700",
    );
    expect(
      renderGoldAccentCallout("<strong>note</strong>", { accentSide: "right" }),
    ).toContain(`border-right: 4px solid ${EMAIL_TOKENS.colors.gold}`);
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
    expect(html).toContain(EMAIL_TOKENS.colors.userCard);
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
    expect(html).toContain(EMAIL_TOKENS.colors.adminPage);
    expect(html).toContain(`border-bottom: 3px solid ${EMAIL_TOKENS.colors.gold}`);
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
