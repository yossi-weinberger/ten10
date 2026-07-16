import { describe, expect, it } from "vitest";
import { extractSemanticContract } from "../_tests/email-semantic-contract.ts";
import { renderDownloadEmail } from "./email-template.ts";

const jumboMailLink = "https://example.test/jumbo-mail-download";
const directDownloadLink = "https://example.test/releases/Ten10-Setup.exe";
const subject = "קישור להורדת Ten10";
const headerSlogan = "ניהול מעשרות ותקציב פיננסי פשוט ומדויק";

function expectedTextBody(
  jumboUrl: string,
  directUrl: string | null,
): string {
  return directUrl
    ? `שלום,

לבקשתך, הנה הקישורים להורדת תוכנת Ten10:

1. להורדה דרך ג'מבו מייל (למי שחסום לו הגלישה ויש לו מייל בלבד):
${jumboUrl}

2. להורדה ישירה:
${directUrl}

אם הקישור לא נפתח, נא לבקש מסינון האינטרנט שלך לאשר אותו.

בברכה,
צוות Ten10`
    : `שלום,

לבקשתך, הנה הקישורים להורדת תוכנת Ten10:

1. להורדה דרך ג'מבו מייל (למי שחסום לו הגלישה ויש לו מייל בלבד):
${jumboUrl}



אם הקישור לא נפתח, נא לבקש מסינון האינטרנט שלך לאשר אותו.

בברכה,
צוות Ten10`;
}

function expectedOrderedText(
  jumboUrl: string,
  directUrl: string | null,
): string[] {
  const orderedText = [
    headerSlogan,
    "שלום,",
    "לבקשתך, הנה הקישורים להורדת תוכנת Ten10 לניהול מעשרות:",
    "להורדה דרך ג'מבו מייל",
    "למי שחסום לו הגלישה ויש לו מייל בלבד",
    `או לחץ על הקישור: ${jumboUrl}`,
  ];

  if (directUrl) orderedText.push("להורדה ישירה");

  orderedText.push(
    "שים לב: אם הקישור לא נפתח (למשל בנטפרי/אתרוג), ייתכן שצריך לבקש אישור מיוחד מהסינון שלך עבור הקישור הספציפי הזה.",
    "לפרטים נוספים על התוכנה",
    "בברכה,",
    "צוות Ten10",
    "נא לא להשיב למייל זה. לשאלות ותמיכה ניתן לפנות לכתובת: support@ten10-app.com",
    "קישור ישיר (JumboMail) להעתקה:",
    jumboUrl,
  );

  if (directUrl) {
    orderedText.push("קישור להורדה ישירה:", directUrl);
  }

  return orderedText;
}

function expectedLinks(
  jumboUrl: string,
  directUrl: string | null,
): Array<{ href: string; text: string }> {
  const links = [
    {
      href: jumboUrl,
      text: "להורדה דרך ג'מבו מייל",
    },
    {
      href: jumboUrl,
      text: jumboUrl,
    },
  ];

  if (directUrl) {
    links.push({
      href: directUrl,
      text: "להורדה ישירה",
    });
  }

  links.push(
    {
      href: "https://ten10-app.com/landing",
      text: "לפרטים נוספים על התוכנה",
    },
    {
      href: "mailto:support@ten10-app.com",
      text: "support@ten10-app.com",
    },
  );

  return links;
}

describe("download email template", () => {
  it("preserves the complete contract without a direct link", () => {
    const rendered = renderDownloadEmail({
      directDownloadLink: null,
      jumboMailLink,
    });
    const contract = extractSemanticContract(rendered.htmlBody);

    expect(rendered.subject).toBe(subject);
    expect(rendered.textBody).toBe(expectedTextBody(jumboMailLink, null));
    expect(contract.orderedText).toEqual(
      expectedOrderedText(jumboMailLink, null),
    );
    expect(contract.links).toEqual(expectedLinks(jumboMailLink, null));
  });

  it("preserves the complete contract with a direct link", () => {
    const rendered = renderDownloadEmail({
      directDownloadLink,
      jumboMailLink,
    });
    const contract = extractSemanticContract(rendered.htmlBody);

    expect(rendered.subject).toBe(subject);
    expect(rendered.textBody).toBe(
      expectedTextBody(jumboMailLink, directDownloadLink),
    );
    expect(contract.orderedText).toEqual(
      expectedOrderedText(jumboMailLink, directDownloadLink),
    );
    expect(contract.links).toEqual(
      expectedLinks(jumboMailLink, directDownloadLink),
    );
  });

  it("escapes dynamic URLs while preserving exact decoded contracts", () => {
    const unsafeJumboMailLink =
      'https://example.test/download?name=Ten10&note=<script>"x"</script>';
    const unsafeDirectDownloadLink =
      "https://example.test/direct?file=Ten10&variant='portable'";

    const rendered = renderDownloadEmail({
      directDownloadLink: unsafeDirectDownloadLink,
      jumboMailLink: unsafeJumboMailLink,
    });
    const contract = extractSemanticContract(rendered.htmlBody);

    expect(rendered.textBody).toBe(
      expectedTextBody(unsafeJumboMailLink, unsafeDirectDownloadLink),
    );
    expect(contract.orderedText).toEqual(
      expectedOrderedText(unsafeJumboMailLink, unsafeDirectDownloadLink),
    );
    expect(contract.links).toEqual(
      expectedLinks(unsafeJumboMailLink, unsafeDirectDownloadLink),
    );
    expect(rendered.htmlBody).not.toContain(unsafeJumboMailLink);
    expect(rendered.htmlBody).not.toContain(unsafeDirectDownloadLink);
  });
});
