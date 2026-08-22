import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setEmbeddedPackageVersions } from "@canonical/summon-core";
import { afterEach, describe, expect, it } from "vitest";
import { readVersion } from "./versions.js";

/**
 * The workspace manifest, read by PATH (a sibling walk of the one the module
 * performs) — the tree-side expectation comes from here rather than a
 * hardcoded literal. Deliberately not a `require("…/package.json")`: neither
 * production manifest this module resolves exposes a `"./package.json"`
 * subpath in its exports map, so the subpath require throws under plain
 * Node — the very divergence the walk exists to close.
 */
const here = dirname(fileURLToPath(import.meta.url));
const manifestVersion = (manifestPath: string): string =>
  (JSON.parse(readFileSync(manifestPath, "utf-8")) as { version: string })
    .version;

/**
 * The precedence contract, mirrored from summon-package's `resolveOwnVersion`:
 * the installed tree first, the host-injected embedded store second,
 * `"unknown"` last. The cases pin the PRODUCTION names — the walk reads
 * manifests off disk with no `exports` gate, so the pins hold under node and
 * bun alike (the old require-subpath tier resolved these names only under
 * bun, which is how the shipped node runtime silently lost the tree tier).
 */
describe("readVersion (the compiled-binary fallback)", () => {
  afterEach(() => {
    setEmbeddedPackageVersions({});
  });

  it("resolves the generator's OWN name from the tree — a decoy injection must not shadow it", () => {
    // The workspace manifest two levels above this file — what the walk's
    // ancestor-package.json probe must find from src/ and dist/esm/ alike.
    const installed = manifestVersion(resolve(here, "../../package.json"));
    expect(installed).not.toBe("9.9.9");
    setEmbeddedPackageVersions({ "@canonical/summon-application": "9.9.9" });
    expect(readVersion("@canonical/summon-application")).toBe(installed);
  });

  it("resolves an installed DEPENDENCY from the tree via the node_modules probe — injection still must not shadow", () => {
    setEmbeddedPackageVersions({ "@canonical/summon-core": "9.9.9" });
    const version = readVersion("@canonical/summon-core");
    // Layout-agnostic on purpose (the link may live at any ancestor's
    // node_modules): the pin is that the TREE answered — a real semver that
    // is neither the decoy nor the terminal degradation.
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(version).not.toBe("9.9.9");
  });

  it("falls back to the host-injected version when the walk finds no manifest (/$bunfs)", () => {
    setEmbeddedPackageVersions({ "@canonical/summon-nonexistent": "9.9.9" });
    expect(readVersion("@canonical/summon-nonexistent")).toBe("9.9.9");
  });

  it('degrades to "unknown" when neither the tree nor an injection knows the name', () => {
    expect(readVersion("@canonical/summon-nonexistent")).toBe("unknown");
  });
});
