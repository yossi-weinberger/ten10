import { describe, expect, it } from "vitest";
import {
  CONFIRMATION_URL_TEMPLATE_VARIABLE,
  readRepositoryAuthTemplates,
  renderAuthTemplatePreview,
  SYNTHETIC_CONFIRMATION_URL_BASE,
  type AuthTemplate,
} from "./auth-email-template-parser.ts";
import { extractSemanticContract } from "./email-semantic-contract.ts";

const EXPECTED_CONTRACTS: Record<
  AuthTemplate["name"],
  {
    subject: string;
    orderedText: string[];
    links: Array<{ text: string; href: string }>;
    previewPath: string;
  }
> = {
  "confirm-signup": {
    subject: "אשר את הרשמתך ל-Ten10",
    orderedText: [
      "ניהול מעשרות ותקציב פיננסי פשוט ומדויק",
      "ברוכים הבאים ל-Ten10!",
      "שמחים שהצטרפת אלינו.",
      "כדי להתחיל להשתמש במערכת, אנא אשר את כתובת האימייל שלך על ידי לחיצה על הכפתור למטה:",
      "אשר הרשמה",
      "אם לא נרשמת ל-Ten10, ניתן להתעלם ממייל זה.",
      "© 2025 Ten10. כל הזכויות שמורות.",
    ],
    links: [
      {
        href: CONFIRMATION_URL_TEMPLATE_VARIABLE,
        text: "אשר הרשמה",
      },
    ],
    previewPath: "tmp/email-previews/auth-confirm-signup-he.html",
  },
  "reset-password": {
    subject: "איפוס סיסמה ל-Ten10",
    orderedText: [
      "ניהול מעשרות ותקציב פיננסי פשוט ומדויק",
      "איפוס סיסמה",
      "קיבלנו בקשה לאיפוס הסיסמה שלך.",
      "לחץ על הכפתור למטה כדי לבחור סיסמה חדשה:",
      "אפס סיסמה",
      "אם לא ביקשת לאפס את הסיסמה, ניתן להתעלם ממייל זה בבטחה.",
      "© 2025 Ten10. כל הזכויות שמורות.",
    ],
    links: [
      {
        href: CONFIRMATION_URL_TEMPLATE_VARIABLE,
        text: "אפס סיסמה",
      },
    ],
    previewPath: "tmp/email-previews/auth-reset-password-he.html",
  },
  "magic-link": {
    subject: "קישור כניסה ל-Ten10",
    orderedText: [
      "ניהול מעשרות ותקציב פיננסי פשוט ומדויק",
      "התחברות ל-Ten10",
      "ביקשת להיכנס למערכת באמצעות קישור קסם.",
      "לחץ על הכפתור למטה כדי להתחבר מיד:",
      "התחבר עכשיו",
      "אם לא ביקשת להתחבר, ניתן להתעלם ממייל זה.",
      "© 2025 Ten10. כל הזכויות שמורות.",
    ],
    links: [
      {
        href: CONFIRMATION_URL_TEMPLATE_VARIABLE,
        text: "התחבר עכשיו",
      },
    ],
    previewPath: "tmp/email-previews/auth-magic-link-he.html",
  },
  invite: {
    subject: "הוזמנת להצטרף ל-Ten10",
    orderedText: [
      "ניהול מעשרות ותקציב פיננסי פשוט ומדויק",
      "הוזמנת ל-Ten10!",
      "הוזמנת להצטרף לניהול המעשרות והתקציב ב-Ten10.",
      "לחץ על הכפתור למטה כדי לקבל את ההזמנה וליצור את החשבון שלך:",
      "קבל הזמנה",
      "© 2025 Ten10. כל הזכויות שמורות.",
    ],
    links: [
      {
        href: CONFIRMATION_URL_TEMPLATE_VARIABLE,
        text: "קבל הזמנה",
      },
    ],
    previewPath: "tmp/email-previews/auth-invite-he.html",
  },
};

function countOccurrences(value: string, search: string): number {
  return value.split(search).length - 1;
}

function rootHtmlAttributes(
  html: string,
): Array<{ name: string; value: string }> {
  const rootHtmlMatch = html.match(/<html\b([^>]*)>/i);

  if (!rootHtmlMatch) {
    throw new Error("Missing root html element");
  }

  return Array.from(
    rootHtmlMatch[1].matchAll(
      /(?:^|\s)(lang|dir)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi,
    ),
    (match) => ({
      name: match[1].toLowerCase(),
      value: (match[2] ?? match[3] ?? match[4]).trim().toLowerCase(),
    }),
  );
}

function assertTemplateContract(template: AuthTemplate): void {
  const expected = EXPECTED_CONTRACTS[template.name];
  const contract = extractSemanticContract(template.html);
  const rootAttributes = rootHtmlAttributes(template.html);

  expect(template.subject).toBe(expected.subject);
  expect(
    rootAttributes
      .filter((attribute) => attribute.name === "lang")
      .map((attribute) => attribute.value),
  ).toEqual(["he"]);
  expect(
    rootAttributes
      .filter((attribute) => attribute.name === "dir")
      .map((attribute) => attribute.value),
  ).toEqual(["rtl"]);
  expect(countOccurrences(template.html, CONFIRMATION_URL_TEMPLATE_VARIABLE)).toBe(
    1,
  );
  expect(contract.orderedText).toEqual(expected.orderedText);
  expect(contract.links).toEqual(expected.links);
}

const templates = readRepositoryAuthTemplates();

describe("Supabase Auth email templates", () => {
  it("parses all four repository template sections", () => {
    expect(templates).toHaveLength(4);
    expect(templates.map((template) => template.name)).toEqual([
      "confirm-signup",
      "reset-password",
      "magic-link",
      "invite",
    ]);
  });

  it.each(templates)(
    "preserves the exact semantic contract for $name",
    (template) => {
      assertTemplateContract(template);
    },
  );

  it("fails the contract when Hebrew visible text is added", () => {
    const template = templates[0];
    const mutated = {
      ...template,
      html: template.html.replace(
        "שמחים שהצטרפת אלינו.",
        "שמחים שהצטרפת אלינו. טקסט חדש אסור",
      ),
    };

    expect(() => assertTemplateContract(mutated)).toThrow();
  });

  it("fails the contract when Hebrew visible text is reordered", () => {
    const template = templates[0];
    const mutated = {
      ...template,
      html: template.html
        .replace("ברוכים הבאים ל-Ten10!", "__TITLE_PLACEHOLDER__")
        .replace("שמחים שהצטרפת אלינו.", "ברוכים הבאים ל-Ten10!")
        .replace("__TITLE_PLACEHOLDER__", "שמחים שהצטרפת אלינו."),
    };

    expect(() => assertTemplateContract(mutated)).toThrow();
  });

  it("fails the contract when a subject changes", () => {
    const template = templates[0];
    const mutated = { ...template, subject: "נושא חדש אסור" };

    expect(() => assertTemplateContract(mutated)).toThrow();
  });

  it("fails the contract when a CTA label changes", () => {
    const template = templates[0];
    const mutated = {
      ...template,
      html: template.html.replace(">אשר הרשמה</a>", ">אישור חדש</a>"),
    };

    expect(() => assertTemplateContract(mutated)).toThrow();
  });

  it("fails the contract when the Supabase template variable changes", () => {
    const template = templates[0];
    const mutated = {
      ...template,
      html: template.html.replace(CONFIRMATION_URL_TEMPLATE_VARIABLE, "{{ .Token }}"),
    };

    expect(() => assertTemplateContract(mutated)).toThrow();
  });

  it("fails the contract when the root html has a duplicate lang attribute", () => {
    const template = templates[0];
    const mutated = {
      ...template,
      html: template.html.replace(
        '<html lang="he" dir="rtl">',
        '<html lang="he" lang="he" dir="rtl">',
      ),
    };

    expect(() => assertTemplateContract(mutated)).toThrow();
  });

  it("fails the contract when the root html has a conflicting lang attribute", () => {
    const template = templates[0];
    const mutated = {
      ...template,
      html: template.html.replace(
        '<html lang="he" dir="rtl">',
        '<html lang="he" lang="en" dir="rtl">',
      ),
    };

    expect(() => assertTemplateContract(mutated)).toThrow();
  });

  it("fails the contract when the root html has a duplicate dir attribute", () => {
    const template = templates[0];
    const mutated = {
      ...template,
      html: template.html.replace(
        '<html lang="he" dir="rtl">',
        '<html lang="he" dir="rtl" dir="rtl">',
      ),
    };

    expect(() => assertTemplateContract(mutated)).toThrow();
  });

  it("fails the contract when the root html has a conflicting dir attribute", () => {
    const template = templates[0];
    const mutated = {
      ...template,
      html: template.html.replace(
        '<html lang="he" dir="rtl">',
        '<html lang="he" dir="rtl" dir="ltr">',
      ),
    };

    expect(() => assertTemplateContract(mutated)).toThrow();
  });

  it("fails the contract for an unquoted conflicting lang duplicate", () => {
    const template = templates[0];
    const mutated = {
      ...template,
      html: template.html.replace(
        '<html lang="he" dir="rtl">',
        '<html lang="he" lang=en dir="rtl">',
      ),
    };

    expect(() => assertTemplateContract(mutated)).toThrow();
  });

  it("fails the contract for an unquoted conflicting dir duplicate", () => {
    const template = templates[0];
    const mutated = {
      ...template,
      html: template.html.replace(
        '<html lang="he" dir="rtl">',
        '<html lang="he" dir="rtl" dir=ltr>',
      ),
    };

    expect(() => assertTemplateContract(mutated)).toThrow();
  });

  it("fails the contract for a single-quoted conflicting lang duplicate", () => {
    const template = templates[0];
    const mutated = {
      ...template,
      html: template.html.replace(
        '<html lang="he" dir="rtl">',
        `<html lang="he" lang='en' dir="rtl">`,
      ),
    };

    expect(() => assertTemplateContract(mutated)).toThrow();
  });

  it("fails the contract for a single-quoted conflicting dir duplicate", () => {
    const template = templates[0];
    const mutated = {
      ...template,
      html: template.html.replace(
        '<html lang="he" dir="rtl">',
        `<html lang="he" dir="rtl" dir='ltr'>`,
      ),
    };

    expect(() => assertTemplateContract(mutated)).toThrow();
  });

  it("generates synthetic local previews without changing repository variables", () => {
    for (const template of templates) {
      const previewHtml = renderAuthTemplatePreview(template);

      expect(template.html).toContain(CONFIRMATION_URL_TEMPLATE_VARIABLE);
      expect(previewHtml).not.toContain(CONFIRMATION_URL_TEMPLATE_VARIABLE);
      expect(previewHtml).toContain(
        `${SYNTHETIC_CONFIRMATION_URL_BASE}/${template.name}`,
      );
    }
  });
});
