import { describe, expect, it } from "vitest";
import { draftWasEdited } from "./draft-edit";

describe("draftWasEdited", () => {
  const original = { description: "מאפים", amount: 15 };

  it("is unchanged when the text and amount match", () => {
    expect(draftWasEdited({ description: " מאפים ", amount: 15 }, original)).toBe(false);
  });

  it("is edited when the description or amount changes", () => {
    expect(draftWasEdited({ description: "לחם", amount: 15 }, original)).toBe(true);
    expect(draftWasEdited({ description: "מאפים", amount: 20 }, original)).toBe(true);
  });
});
