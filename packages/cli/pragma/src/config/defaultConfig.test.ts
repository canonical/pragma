import { describe, expect, it } from "vitest";
import { VALID_CHANNELS } from "../constants.js";
import { parsePackageEntry } from "../domains/refs/operations/parseRef.js";
import { DEFAULT_CONFIG } from "./defaultConfig.js";

describe("DEFAULT_CONFIG", () => {
  it("declares a valid channel", () => {
    expect(VALID_CHANNELS).toContain(DEFAULT_CONFIG.channel);
  });

  it("declares at least one package, all parseable", () => {
    expect(DEFAULT_CONFIG.packages.length).toBeGreaterThan(0);
    for (const entry of DEFAULT_CONFIG.packages) {
      const ref = parsePackageEntry(entry);
      expect(ref.pkg.length).toBeGreaterThan(0);
    }
  });

  it("carries the canonical design-system package by default", () => {
    const names = DEFAULT_CONFIG.packages.map((entry) =>
      typeof entry === "string" ? entry : entry.name,
    );
    expect(names).toContain("@canonical/design-system");
  });

  it("does not declare fields the document must not layer", () => {
    // tier/trace/framework defaults are semantic absences, and packages
    // must reach the merge via DEFAULT_PACKAGES (see defaultConfig.ts).
    expect(DEFAULT_CONFIG.tier).toBeUndefined();
    expect(DEFAULT_CONFIG.trace).toBeUndefined();
    expect(DEFAULT_CONFIG.framework).toBeUndefined();
  });
});
