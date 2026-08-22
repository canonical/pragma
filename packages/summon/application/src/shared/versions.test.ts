import { createRequire } from "node:module";
import { setEmbeddedPackageVersions } from "@canonical/summon-core";
import { afterEach, describe, expect, it } from "vitest";
import { readVersion } from "./versions.js";

/**
 * The same resolver `readVersion` uses, anchored to this test file (a sibling
 * of versions.ts, so both resolve through the identical node_modules chain) —
 * the tree-side expectations come from here rather than hardcoded literals.
 */
const require = createRequire(import.meta.url);

/**
 * The precedence contract, mirrored from summon-package's `resolveOwnVersion`:
 * the installed tree first, the host-injected embedded store second,
 * `"unknown"` last. `readVersion`'s require is anchored inside the module, so
 * the cases steer it with real names — a package that is genuinely installed
 * for the tree side, and a name no tree can resolve for the embedded side
 * (the same miss a compiled binary's `/$bunfs` layout produces for every
 * name).
 */
describe("readVersion (the compiled-binary fallback)", () => {
  afterEach(() => {
    setEmbeddedPackageVersions({});
  });

  it("prefers the installed tree when require can resolve the manifest", () => {
    // A direct dependency whose manifest is require-resolvable under node AND
    // bun (no `exports` encapsulation) — the tree value to expect.
    const installed = (
      require("typescript/package.json") as { version: string }
    ).version;
    expect(installed).not.toBe("9.9.9");
    // A decoy injection must not shadow the tree — require stays primary.
    setEmbeddedPackageVersions({ typescript: "9.9.9" });
    expect(readVersion("typescript")).toBe(installed);
  });

  it("falls back to the host-injected version when require cannot resolve (/$bunfs)", () => {
    setEmbeddedPackageVersions({ "@canonical/summon-nonexistent": "9.9.9" });
    expect(readVersion("@canonical/summon-nonexistent")).toBe("9.9.9");
  });

  it('degrades to "unknown" when neither the tree nor an injection knows the name', () => {
    expect(readVersion("@canonical/summon-nonexistent")).toBe("unknown");
  });
});
