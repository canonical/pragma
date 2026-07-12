/**
 * Tests for the pure guard/inventory analysis, with fabricated workspace
 * fixtures and registry statuses (no I/O).
 */

import { describe, expect, test } from "vitest";
import { analyze, collectRegistryLookups } from "./analysis.js";
import type { RegistryStatus } from "./registry.js";
import type { WorkspacePackage } from "./workspace.js";

function pkg(
  name: string,
  options: {
    private?: boolean;
    version?: string;
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  } = {},
): WorkspacePackage {
  const manifest: Record<string, unknown> = { name };
  if (options.dependencies) manifest.dependencies = options.dependencies;
  if (options.peerDependencies)
    manifest.peerDependencies = options.peerDependencies;
  if (options.optionalDependencies)
    manifest.optionalDependencies = options.optionalDependencies;
  return {
    name,
    dir: `/repo/packages/${name.replace("@canonical/", "")}`,
    relDir: `packages/${name.replace("@canonical/", "")}`,
    version: options.version ?? "0.29.0",
    private: options.private === true,
    manifest,
  };
}

const published = (versions: string[]): RegistryStatus => ({
  state: "published",
  versions,
  latest: versions[versions.length - 1] ?? null,
  hasProvenance: false,
});
const ABSENT: RegistryStatus = { state: "absent" };
const UNKNOWN: RegistryStatus = { state: "unknown", reason: "429" };

describe("collectRegistryLookups", () => {
  test("collects every publishable package plus publishable workspace deps, deduplicated", () => {
    const packages = [
      pkg("@canonical/a", { dependencies: { "@canonical/b": "^0.29.0" } }),
      pkg("@canonical/b"),
      pkg("@canonical/hidden", { private: true }),
      pkg("@canonical/c", {
        // private workspace dep: unconditional error, no lookup needed
        dependencies: { "@canonical/hidden": "^0.29.0", react: "^19.0.0" },
        peerDependencies: { "@canonical/b": "^0.29.0" },
      }),
    ];
    expect(collectRegistryLookups(packages)).toEqual([
      "@canonical/a",
      "@canonical/b",
      "@canonical/c",
    ]);
  });
});

describe("analyze — dependency edges", () => {
  test("published → never-published dep is a hard ERROR in pr mode", () => {
    const packages = [
      pkg("@canonical/i18n-react", {
        dependencies: { "@canonical/i18n-core": "^0.27.1-experimental.0" },
      }),
      pkg("@canonical/i18n-core"),
    ];
    const statuses = new Map<string, RegistryStatus>([
      ["@canonical/i18n-react", published(["0.27.1"])],
      ["@canonical/i18n-core", ABSENT],
    ]);
    const { findings } = analyze({ packages, statuses, mode: "pr" });
    const errors = findings.filter((finding) => finding.level === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("has never been published to npm");
  });

  test("the same edge is downgraded to WARN in publish mode", () => {
    const packages = [
      pkg("@canonical/i18n-react", {
        dependencies: { "@canonical/i18n-core": "^0.27.1" },
      }),
      pkg("@canonical/i18n-core"),
    ];
    const statuses = new Map<string, RegistryStatus>([
      ["@canonical/i18n-react", published(["0.27.1"])],
      ["@canonical/i18n-core", ABSENT],
    ]);
    const { findings } = analyze({ packages, statuses, mode: "publish" });
    // Inventory lines are warnings-free; the edge shows up as warn.
    const edgeFindings = findings.filter((finding) =>
      finding.message.includes("→"),
    );
    expect(edgeFindings).toHaveLength(1);
    expect(edgeFindings[0].level).toBe("warn");
    expect(edgeFindings[0].message).toContain("publish mode");
  });

  test("never-published OPTIONAL dep is a WARN, not an error — npm skips failed optional deps", () => {
    const packages = [
      pkg("@canonical/a", {
        optionalDependencies: { "@canonical/extra": "^0.29.0" },
      }),
      pkg("@canonical/extra"),
    ];
    const statuses = new Map<string, RegistryStatus>([
      ["@canonical/a", published(["0.29.0"])],
      ["@canonical/extra", ABSENT],
    ]);
    for (const mode of ["pr", "publish"] as const) {
      const { findings } = analyze({ packages, statuses, mode });
      const edge = findings.find((finding) => finding.message.includes("→"));
      expect(edge?.level).toBe("warn");
      expect(edge?.message).toContain("optional");
      expect(edge?.message).toContain("still succeeds");
      expect(edge?.message).not.toContain("fails today");
    }
  });

  test("private workspace dep and workspace: protocol stay hard errors", () => {
    const packages = [
      pkg("@canonical/a", {
        dependencies: {
          "@canonical/hidden": "^0.29.0",
          "@canonical/b": "workspace:*",
        },
      }),
      pkg("@canonical/b"),
      pkg("@canonical/hidden", { private: true }),
    ];
    const statuses = new Map<string, RegistryStatus>([
      ["@canonical/a", published(["0.29.0"])],
      ["@canonical/b", published(["0.29.0"])],
    ]);
    const { findings } = analyze({ packages, statuses, mode: "pr" });
    const errors = findings.filter((finding) => finding.level === "error");
    expect(errors).toHaveLength(2);
    expect(errors.map((finding) => finding.message).join("\n")).toContain(
      "PRIVATE workspace package",
    );
    expect(errors.map((finding) => finding.message).join("\n")).toContain(
      '"workspace:" protocol',
    );
  });

  test("unsatisfied published range is a WARN", () => {
    const packages = [
      pkg("@canonical/a", { dependencies: { "@canonical/b": "^0.30.0" } }),
      pkg("@canonical/b", { version: "0.30.0" }),
    ];
    const statuses = new Map<string, RegistryStatus>([
      ["@canonical/a", published(["0.29.0"])],
      ["@canonical/b", published(["0.28.0", "0.29.0"])],
    ]);
    const { findings } = analyze({ packages, statuses, mode: "pr" });
    expect(findings).toHaveLength(1);
    expect(findings[0].level).toBe("warn");
    expect(findings[0].message).toContain("no published version");
  });

  test("fail-closed: unknown dep status is WARN in pr mode, ERROR in publish mode", () => {
    const packages = [
      pkg("@canonical/a", { dependencies: { "@canonical/b": "^0.29.0" } }),
      pkg("@canonical/b"),
    ];
    const statuses = new Map<string, RegistryStatus>([
      ["@canonical/a", published(["0.29.0"])],
      ["@canonical/b", UNKNOWN],
    ]);
    const pr = analyze({ packages, statuses, mode: "pr" });
    const prEdge = pr.findings.find((finding) => finding.message.includes("→"));
    expect(prEdge?.level).toBe("warn");
    expect(prEdge?.message).toContain("failing closed");

    const publish = analyze({ packages, statuses, mode: "publish" });
    const publishEdge = publish.findings.find((finding) =>
      finding.message.includes("→"),
    );
    expect(publishEdge?.level).toBe("error");
  });
});

describe("analyze — release-readiness inventory", () => {
  test("lists EVERY never-published publishable package, not just dep targets", () => {
    const packages = [
      pkg("@canonical/i18n-core"),
      pkg("@canonical/i18n-react", {
        dependencies: { "@canonical/i18n-core": "^0.27.1" },
      }),
      pkg("@canonical/storybook-addon-relay"),
      pkg("@canonical/vitest-config-react"),
      pkg("@canonical/svelte-ds-global", {
        version: "0.29.0-experimental.0",
      }),
      pkg("@canonical/utils"),
      pkg("@canonical/private-thing", { private: true }),
    ];
    const statuses = new Map<string, RegistryStatus>([
      ["@canonical/i18n-core", ABSENT],
      ["@canonical/i18n-react", ABSENT],
      ["@canonical/storybook-addon-relay", ABSENT],
      ["@canonical/vitest-config-react", ABSENT],
      ["@canonical/svelte-ds-global", ABSENT],
      ["@canonical/utils", published(["0.29.0"])],
    ]);
    const { inventory, findings, publishableCount } = analyze({
      packages,
      statuses,
      mode: "pr",
    });
    expect(publishableCount).toBe(6);
    expect(inventory.map((entry) => entry.name)).toEqual([
      "@canonical/i18n-core",
      "@canonical/i18n-react",
      "@canonical/storybook-addon-relay",
      "@canonical/svelte-ds-global",
      "@canonical/vitest-config-react",
    ]);
    expect(inventory.every((entry) => entry.status === "never-published")).toBe(
      true,
    );
    // The inventory itself is a report, not an error: private packages are
    // excluded, and the only hard error is the published->unpublished edge.
    const errors = findings.filter((finding) => finding.level === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("@canonical/i18n-react");
  });

  test("inventory is empty when everything is published", () => {
    const packages = [pkg("@canonical/utils")];
    const statuses = new Map<string, RegistryStatus>([
      ["@canonical/utils", published(["0.29.0"])],
    ]);
    const { inventory, findings } = analyze({ packages, statuses, mode: "pr" });
    expect(inventory).toEqual([]);
    expect(findings).toEqual([]);
  });

  test("fail-closed: undeterminable package is WARN in pr mode, ERROR in publish mode", () => {
    const packages = [pkg("@canonical/utils")];
    const statuses = new Map<string, RegistryStatus>([
      ["@canonical/utils", UNKNOWN],
    ]);
    const pr = analyze({ packages, statuses, mode: "pr" });
    expect(pr.inventory).toHaveLength(1);
    expect(pr.inventory[0].status).toBe("unknown");
    expect(pr.findings[0].level).toBe("warn");

    const publish = analyze({ packages, statuses, mode: "publish" });
    expect(publish.findings[0].level).toBe("error");
  });

  test("a missing lookup is treated like unknown (never silently published)", () => {
    const packages = [pkg("@canonical/utils")];
    const { inventory, findings } = analyze({
      packages,
      statuses: new Map(),
      mode: "pr",
    });
    expect(inventory[0].status).toBe("unknown");
    expect(findings[0].message).toContain("no lookup performed");
  });
});
