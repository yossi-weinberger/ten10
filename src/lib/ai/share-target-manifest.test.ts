import { describe, expect, it } from "vitest";
import source from "../../../public/manifest.json";
import {
  manifestForShareTarget,
  shareTargetBuildEnabled,
} from "./share-target-manifest";

describe("share target manifest", () => {
  it("builds a manifest without share_target unless the variable is exactly true", () => {
    expect(shareTargetBuildEnabled(undefined)).toBe(false);
    expect(shareTargetBuildEnabled("")).toBe(false);
    expect(shareTargetBuildEnabled("1")).toBe(false);
    expect(shareTargetBuildEnabled("true")).toBe(true);
    expect(manifestForShareTarget(source, false)).not.toHaveProperty("share_target");
    expect(manifestForShareTarget({ ...source, share_target: { action: "/old" } }, false)).not.toHaveProperty("share_target");
  });

  it("builds a manifest that includes the share target when the variable is true", () => {
    const built = manifestForShareTarget(source, true);
    expect(built.share_target).toMatchObject({
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
    });
    expect(built.name).toBe(source.name);
  });
});
