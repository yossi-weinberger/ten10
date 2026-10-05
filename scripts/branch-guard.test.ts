import { describe, expect, it } from "vitest";
import branchGuard from "./branch-guard.cjs";

const { getMainBranchError } = branchGuard;

describe("deployment branch guard", () => {
  it("allows deployment actions from main", () => {
    expect(getMainBranchError("deploy", "main")).toBeNull();
  });

  it("blocks deployment actions from feature branches", () => {
    expect(getMainBranchError("deploy", "feat/calendar")).toBe(
      "Refusing to deploy from branch 'feat/calendar'. Switch to main first.",
    );
  });

  it("blocks deployment actions from detached HEAD", () => {
    expect(getMainBranchError("release", "")).toBe(
      "Refusing to release from branch 'detached HEAD'. Switch to main first.",
    );
  });
});
