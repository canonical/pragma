import { describe, expect, test } from "bun:test";

import {
  classifyLsRemote,
  type DeclaredPack,
  type Finding,
  findParity,
  formatFindings,
  parseGitSource,
  parseSourceRef,
  type RefResolution,
  type ResolveRef,
} from "./check-pack-parity.js";

// The real declaration set, in miniature: one tag-pinned pack, one floating
// branch pack, one npm-overridden pack, and the repository's own self pack.
const DECLARED: DeclaredPack[] = [
  {
    name: "@canonical/design-system",
    source: "git+https://github.com/canonical/design-system.git#main",
  },
  {
    name: "@canonical/anatomy-dsl",
    source: "git+https://github.com/canonical/anatomy-dsl.git#main",
  },
  {
    name: "@canonical/code-standards",
    source: "git+https://github.com/canonical/web-code-standards.git#v0.1.5",
  },
  {
    name: "@canonical/ds-implementations",
    source: "git+https://github.com/canonical/pragma.git#main",
  },
];

const OVERRIDES = ["@canonical/anatomy-dsl"];
const SELF = "@canonical/ds-implementations";

// The commit the v0.1.5 tag really peels to, and the stale commit the v0.36.0
// snapshot really recorded — the measured live defect this gate exists for.
const TAG_SHA = "fcd3ac2dea458775e5b79344b3237a3fcb37add9";
const STALE_SHA = "ab7ae14024f3e52dd19e378eec5861dbc4b9ba72";
const MAIN_SHA = "ce00818852628857da9c4a67bf8556c7cfda287d";

/** A resolver that answers from a fixed table — no network in this suite. */
function resolver(table: Record<string, RefResolution>): ResolveRef {
  return (_url, ref) => table[ref] ?? { kind: "missing" };
}

const RESOLUTIONS = resolver({
  main: { kind: "branch", sha: MAIN_SHA },
  "v0.1.5": { kind: "tag", sha: TAG_SHA },
});

/** A manifest sourceRef in the bundler's `<name>@<kind>:<resolved>` format. */
function sourceRef(codeStandardsSha: string, version: string): string {
  return [
    `@canonical/design-system@git:${MAIN_SHA}`,
    "@canonical/anatomy-dsl@npm:0.2.2",
    `@canonical/code-standards@git:${codeStandardsSha}`,
    `@canonical/ds-implementations@self:v${version}`,
  ].join(", ");
}

const fatal = (findings: Finding[]): Finding[] =>
  findings.filter((finding) => finding.fatal);

describe("the staleness that shipped in v0.36.0", () => {
  // The exact measured state: config pins tag v0.1.5 (= fcd3ac2), the
  // committed snapshot was built from ab7ae14 — a revision from before the
  // upstream cs:name → rdfs:label migration. Nothing failed the release.
  test("a snapshot built from a commit the declared tag does not resolve to is fatal", () => {
    const findings = findParity({
      declared: DECLARED,
      manifest: {
        version: "0.34.0",
        sourceRef: sourceRef(STALE_SHA, "0.34.0"),
      },
      overrideNames: OVERRIDES,
      selfPack: SELF,
      resolve: RESOLUTIONS,
    });

    const bad = fatal(findings);
    expect(bad).toHaveLength(1);
    expect(bad[0]).toMatchObject({
      pack: "@canonical/code-standards",
      kind: "pin-mismatch",
    });
  });

  test("a snapshot rebuilt from the pinned tag clears it", () => {
    const findings = findParity({
      declared: DECLARED,
      manifest: { version: "0.36.0", sourceRef: sourceRef(TAG_SHA, "0.36.0") },
      overrideNames: OVERRIDES,
      selfPack: SELF,
      resolve: RESOLUTIONS,
    });

    expect(fatal(findings)).toHaveLength(0);
    expect(
      findings.find((f) => f.pack === "@canonical/code-standards")?.kind,
    ).toBe("proven");
  });
});

describe("floating sources", () => {
  test("a branch ref is never equality-gated — drift is reported, not fatal", () => {
    const drifted = sourceRef(TAG_SHA, "0.36.0").replace(
      MAIN_SHA,
      "0000000000000000000000000000000000000000",
    );
    const findings = findParity({
      declared: DECLARED,
      manifest: { version: "0.36.0", sourceRef: drifted },
      overrideNames: OVERRIDES,
      selfPack: SELF,
      resolve: RESOLUTIONS,
    });

    const ds = findings.find((f) => f.pack === "@canonical/design-system");
    expect(ds?.kind).toBe("floating");
    expect(ds?.fatal).toBe(false);
  });

  test("release mode proves freshness instead: an inherited snapshot is fatal", () => {
    const findings = findParity({
      declared: DECLARED,
      manifest: { version: "0.36.0", sourceRef: sourceRef(TAG_SHA, "0.36.0") },
      overrideNames: OVERRIDES,
      selfPack: SELF,
      resolve: RESOLUTIONS,
      releaseVersion: "0.37.0",
    });

    const bad = fatal(findings);
    expect(bad).toHaveLength(1);
    expect(bad[0]).toMatchObject({ pack: "(snapshot)", kind: "stale" });
  });

  test("a snapshot rebuilt by this release passes freshness", () => {
    const findings = findParity({
      declared: DECLARED,
      manifest: { version: "0.37.0", sourceRef: sourceRef(TAG_SHA, "0.37.0") },
      overrideNames: OVERRIDES,
      selfPack: SELF,
      resolve: RESOLUTIONS,
      releaseVersion: "0.37.0",
    });

    expect(fatal(findings)).toHaveLength(0);
  });
});

describe("the explicit waiver", () => {
  test("accept_committed_snapshot waives freshness and unverifiability", () => {
    const findings = findParity({
      declared: DECLARED,
      manifest: { version: "0.36.0", sourceRef: sourceRef(TAG_SHA, "0.36.0") },
      overrideNames: OVERRIDES,
      selfPack: SELF,
      // No token in the job: the private pin cannot be resolved either.
      resolve: resolver({
        main: { kind: "unreachable", error: "auth required" },
        "v0.1.5": { kind: "unreachable", error: "auth required" },
      }),
      releaseVersion: "0.37.0",
      acceptCommittedSnapshot: true,
    });

    expect(fatal(findings)).toHaveLength(0);
    // Waived, not silenced: both survive as non-fatal findings.
    expect(findings.some((f) => f.kind === "stale")).toBe(true);
    expect(findings.some((f) => f.kind === "pin-unverifiable")).toBe(true);
  });

  test("the waiver never covers a PROVEN pin mismatch", () => {
    const findings = findParity({
      declared: DECLARED,
      manifest: {
        version: "0.36.0",
        sourceRef: sourceRef(STALE_SHA, "0.36.0"),
      },
      overrideNames: OVERRIDES,
      selfPack: SELF,
      resolve: RESOLUTIONS,
      releaseVersion: "0.37.0",
      acceptCommittedSnapshot: true,
    });

    const bad = fatal(findings);
    expect(bad).toHaveLength(1);
    expect(bad[0]).toMatchObject({
      pack: "@canonical/code-standards",
      kind: "pin-mismatch",
    });
  });

  test("without the waiver, an unresolvable pin fails a release", () => {
    const findings = findParity({
      declared: DECLARED,
      manifest: { version: "0.37.0", sourceRef: sourceRef(TAG_SHA, "0.37.0") },
      overrideNames: OVERRIDES,
      selfPack: SELF,
      resolve: resolver({
        main: { kind: "unreachable", error: "auth required" },
        "v0.1.5": { kind: "unreachable", error: "auth required" },
      }),
      releaseVersion: "0.37.0",
    });

    expect(fatal(findings).some((f) => f.kind === "pin-unverifiable")).toBe(
      true,
    );
  });

  test("locally, an unresolvable pin is reported but not fatal — credentials are environmental", () => {
    const findings = findParity({
      declared: DECLARED,
      manifest: { version: "0.36.0", sourceRef: sourceRef(TAG_SHA, "0.36.0") },
      overrideNames: OVERRIDES,
      selfPack: SELF,
      resolve: resolver({
        main: { kind: "unreachable", error: "auth required" },
        "v0.1.5": { kind: "unreachable", error: "auth required" },
      }),
    });

    expect(fatal(findings)).toHaveLength(0);
    expect(findings.some((f) => f.kind === "pin-unverifiable")).toBe(true);
  });
});

describe("coverage and lanes", () => {
  test("a declared pack absent from the provenance is fatal", () => {
    const three = sourceRef(TAG_SHA, "0.36.0")
      .split(", ")
      .filter((entry) => !entry.startsWith("@canonical/code-standards"))
      .join(", ");
    const findings = findParity({
      declared: DECLARED,
      manifest: { version: "0.36.0", sourceRef: three },
      overrideNames: OVERRIDES,
      selfPack: SELF,
      resolve: RESOLUTIONS,
    });

    expect(fatal(findings)).toEqual([
      expect.objectContaining({
        pack: "@canonical/code-standards",
        kind: "coverage",
      }),
    ]);
  });

  test("a provenance entry no declaration covers is fatal", () => {
    const extra = `${sourceRef(TAG_SHA, "0.36.0")}, @canonical/retired-pack@git:${MAIN_SHA}`;
    const findings = findParity({
      declared: DECLARED,
      manifest: { version: "0.36.0", sourceRef: extra },
      overrideNames: OVERRIDES,
      selfPack: SELF,
      resolve: RESOLUTIONS,
    });

    expect(fatal(findings)).toEqual([
      expect.objectContaining({
        pack: "@canonical/retired-pack",
        kind: "coverage",
      }),
    ]);
  });

  test("a declared tag that no longer exists upstream is fatal even locally", () => {
    const findings = findParity({
      declared: DECLARED,
      manifest: { version: "0.36.0", sourceRef: sourceRef(TAG_SHA, "0.36.0") },
      overrideNames: OVERRIDES,
      selfPack: SELF,
      resolve: resolver({ main: { kind: "branch", sha: MAIN_SHA } }),
    });

    expect(
      fatal(findings).some(
        (f) =>
          f.pack === "@canonical/code-standards" && f.kind === "pin-mismatch",
      ),
    ).toBe(true);
  });

  test("an overridden pack must record npm provenance", () => {
    const wrongLane = sourceRef(TAG_SHA, "0.36.0").replace(
      "@canonical/anatomy-dsl@npm:0.2.2",
      `@canonical/anatomy-dsl@git:${MAIN_SHA}`,
    );
    const findings = findParity({
      declared: DECLARED,
      manifest: { version: "0.36.0", sourceRef: wrongLane },
      overrideNames: OVERRIDES,
      selfPack: SELF,
      resolve: RESOLUTIONS,
    });

    expect(
      fatal(findings).some(
        (f) => f.pack === "@canonical/anatomy-dsl" && f.kind === "scheme",
      ),
    ).toBe(true);
  });

  test("the self pack must agree with its own manifest version", () => {
    const findings = findParity({
      declared: DECLARED,
      manifest: { version: "0.36.0", sourceRef: sourceRef(TAG_SHA, "0.34.0") },
      overrideNames: OVERRIDES,
      selfPack: SELF,
      resolve: RESOLUTIONS,
    });

    expect(
      fatal(findings).some(
        (f) => f.pack === "@canonical/ds-implementations" && f.kind === "self",
      ),
    ).toBe(true);
  });
});

describe("parsing", () => {
  test("parseSourceRef reads the bundler's format", () => {
    expect(parseSourceRef(sourceRef(TAG_SHA, "0.36.0"))).toEqual([
      { name: "@canonical/design-system", scheme: "git", resolved: MAIN_SHA },
      { name: "@canonical/anatomy-dsl", scheme: "npm", resolved: "0.2.2" },
      { name: "@canonical/code-standards", scheme: "git", resolved: TAG_SHA },
      {
        name: "@canonical/ds-implementations",
        scheme: "self",
        resolved: "v0.36.0",
      },
    ]);
  });

  test("parseGitSource splits url and ref, and rejects other shapes", () => {
    expect(
      parseGitSource("git+https://github.com/canonical/x.git#v0.1.5"),
    ).toEqual({ url: "https://github.com/canonical/x.git", ref: "v0.1.5" });
    expect(parseGitSource("file:///tmp/x")).toBeNull();
    expect(parseGitSource("git+https://github.com/canonical/x.git")).toBeNull();
  });

  test("formatFindings names every finding and renders a verdict", () => {
    const findings = findParity({
      declared: DECLARED,
      manifest: {
        version: "0.34.0",
        sourceRef: sourceRef(STALE_SHA, "0.34.0"),
      },
      overrideNames: OVERRIDES,
      selfPack: SELF,
      resolve: RESOLUTIONS,
    });
    const report = formatFindings(findings);
    expect(report).toContain("@canonical/code-standards");
    expect(report).toContain("parity violation");
  });
});

describe("ls-remote classification", () => {
  test("an annotated tag peels through ^{} to the commit the bundler checks out", () => {
    const output = [
      `569ebb7d455ff4d5b1095893d28e97afe5e74ff8\trefs/tags/v0.1.5`,
      `${TAG_SHA}\trefs/tags/v0.1.5^{}`,
    ].join("\n");
    expect(classifyLsRemote(output, "v0.1.5")).toEqual({
      kind: "tag",
      sha: TAG_SHA,
    });
  });

  test("a lightweight tag IS the commit", () => {
    expect(classifyLsRemote(`${TAG_SHA}\trefs/tags/v0.1.5`, "v0.1.5")).toEqual({
      kind: "tag",
      sha: TAG_SHA,
    });
  });

  test("a branch classifies as floating", () => {
    expect(classifyLsRemote(`${MAIN_SHA}\trefs/heads/main`, "main")).toEqual({
      kind: "branch",
      sha: MAIN_SHA,
    });
  });

  test("no matching ref at all is missing", () => {
    expect(classifyLsRemote("", "v9.9.9")).toEqual({ kind: "missing" });
  });
});
