import { describe, expect, it } from "vitest";
import { extractSemanticContract } from "./email-semantic-contract.ts";

describe("email semantic contract extractor", () => {
  it("ignores harmless source reflow inside a text node", () => {
    const inlineHtml = `
      <div>
        <p>טקסט ארוך שממשיך באותה פסקה</p>
        <a href="https://example.test/action">פתיחת הקישור</a>
      </div>
    `;
    const reflowedHtml = `
      <div>
        <p>
          טקסט ארוך שממשיך
          באותה פסקה
        </p>
        <a href="https://example.test/action">
          פתיחת
          הקישור
        </a>
      </div>
    `;

    expect(extractSemanticContract(reflowedHtml)).toEqual(
      extractSemanticContract(inlineHtml),
    );
  });

  it("preserves block and br boundaries as ordered visible-text items", () => {
    const html = `
      <div>
        <p>פריט ראשון<br>פריט שני</p>
        <p>פריט שלישי</p>
      </div>
    `;

    expect(extractSemanticContract(html).orderedText).toEqual([
      "פריט ראשון",
      "פריט שני",
      "פריט שלישי",
    ]);
  });

  it("treats a br element with attributes as a visible-text boundary", () => {
    const html = `<p>פריט ראשון<br class="spacer">פריט שני</p>`;

    expect(extractSemanticContract(html).orderedText).toEqual([
      "פריט ראשון",
      "פריט שני",
    ]);
  });

  it("detects reordered elements", () => {
    const original = extractSemanticContract(`
      <div>
        <p>פריט ראשון</p>
        <p>פריט שני</p>
      </div>
    `);
    const reordered = extractSemanticContract(`
      <div>
        <p>פריט שני</p>
        <p>פריט ראשון</p>
      </div>
    `);

    expect(reordered.orderedText).not.toEqual(original.orderedText);
    expect(reordered.orderedText).toEqual(["פריט שני", "פריט ראשון"]);
  });
});
