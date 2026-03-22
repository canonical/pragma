import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import detectInstallSource from "./detectInstallSource.js";

describe("detectInstallSource", () => {
  it("returns local install for a checked-out source entrypoint", () => {
    const result = detectInstallSource(
      resolve(import.meta.dirname, "../bin.ts"),
    );

    expect(result.scope).toBe("local");
    expect(result.label).toBe("local install");
  });

  it("returns global install for a global bun path", () => {
    const result = detectInstallSource(
      "/home/user/.bun/install/global/node_modules/.bin/pragma",
    );

    expect(result.scope).toBe("global");
    expect(result.label).toBe("bun (global)");
  });
});
