import { describe, expect, it } from "vitest";
import { DEFAULT_ORIGINS } from "#config";
import type { SemanticPackage } from "../domains/shared/semanticPackage.js";
import buildInstructions from "./instructions.js";

const PACKAGES = [
  { name: "@canonical/design-system" },
] as unknown as readonly SemanticPackage[];

describe("buildInstructions", () => {
  it("contains the six convention lines", () => {
    const text = buildInstructions({
      config: { tier: undefined, channel: "normal" },
      origins: DEFAULT_ORIGINS,
      packages: PACKAGES,
    });

    // One anchor phrase per authored convention line.
    expect(text).toContain("design-system knowledge graph");
    expect(text).toContain("scoped by tier");
    expect(text).toContain("prefixed IRI");
    expect(text).toContain("*_sample");
    expect(text).toContain("per-call overrides");
    expect(text).toContain("pragma://state");
  });

  it("appends the connect-time snapshot with the caveat", () => {
    const text = buildInstructions({
      config: { tier: "apps/lxd", channel: "normal", detail: "digest" },
      origins: DEFAULT_ORIGINS,
      packages: PACKAGES,
    });

    expect(text).toContain(
      "Current state at connect: tier=apps/lxd, channel=normal, detail=digest, packages=1 loaded.",
    );
    expect(text).toContain("re-read pragma://state after any config_* call");
  });

  it("renders unset tier and detail as 'unset' in the snapshot", () => {
    const text = buildInstructions({
      config: { tier: undefined, channel: "normal" },
      origins: DEFAULT_ORIGINS,
      packages: [],
    });

    expect(text).toContain("tier=unset");
    expect(text).toContain("detail=unset");
    expect(text).toContain("packages=0 loaded");
  });

  it("stays within the ~600-token budget", () => {
    const text = buildInstructions({
      config: { tier: "apps/lxd", channel: "experimental", detail: "digest" },
      origins: DEFAULT_ORIGINS,
      packages: PACKAGES,
    });

    // chars/4 estimate, same heuristic as the MCP token estimator.
    expect(Math.ceil(text.length / 4)).toBeLessThanOrEqual(600);
  });
});
