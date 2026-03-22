import { describe, expect, it } from "vitest";
import detectLocalInstall from "./detectLocalInstall.js";

describe("detectLocalInstall", () => {
  it("returns undefined for global installs", () => {
    expect(
      detectLocalInstall(
        "/home/user/.bun/install/global/node_modules/.bin/pragma",
      ),
    ).toBeUndefined();
  });

  it("returns undefined when path cannot be resolved", () => {
    expect(detectLocalInstall("/nonexistent/path/pragma")).toBeUndefined();
  });
});
