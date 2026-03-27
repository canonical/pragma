import { describe, expect, it } from "vitest";
import getPackageShortName from "./getPackageShortName.js";

describe("getPackageShortName", () => {
  it("strips scope from scoped package names", () => {
    expect(getPackageShortName("@canonical/my-package")).toBe("my-package");
  });

  it("returns unscoped names unchanged", () => {
    expect(getPackageShortName("my-package")).toBe("my-package");
  });

  it("handles different scopes", () => {
    expect(getPackageShortName("@scope/pkg")).toBe("pkg");
  });
});
