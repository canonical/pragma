/**
 * The refs cache path for a scoped package must NEST its scope, not flatten
 * it. `sources update` writes to `refsCacheDir()/<sanitizePackageName(pkg)>/…`
 * and every reader (the docsite backend, `require.resolve`-style consumers)
 * expects the npm-native `@scope/name` layout. Flattening `/` to `_` — the
 * old `sanitize` applied to the package name — wrote `@canonical_design-system`
 * while readers looked for `@canonical/design-system`, so a freshly-primed
 * cache read as empty. These pins lock the nesting so that regression cannot
 * return silently.
 */

import { describe, expect, it } from "vitest";
import { sanitizePackageName } from "./resolve.js";

describe("sanitizePackageName", () => {
  it("PRESERVES the scope separator so a scoped package NESTS", () => {
    // The bug, pinned: this must be the nested form, never `@canonical_design-system`.
    expect(sanitizePackageName("@canonical/design-system")).toBe(
      "@canonical/design-system",
    );
    expect(sanitizePackageName("@canonical/anatomy-dsl")).toBe(
      "@canonical/anatomy-dsl",
    );
    expect(sanitizePackageName("@canonical/design-system")).not.toContain(
      "@canonical_",
    );
  });

  it("leaves an unscoped package name untouched", () => {
    expect(sanitizePackageName("design-system")).toBe("design-system");
  });

  it("still strips the other filesystem-illegal characters, per segment", () => {
    // `:*?"<>|` and backslash are illegal path chars — collapsed to `_` —
    // but the scope `/` survives as a real directory boundary.
    expect(sanitizePackageName('@sc:ope/na*me')).toBe("@sc_ope/na_me");
    expect(sanitizePackageName("@a/b\\c")).toBe("@a/b_c");
  });

  it("drops empty/leading/trailing segments so no stray separators leak", () => {
    expect(sanitizePackageName("/design-system")).toBe("design-system");
    expect(sanitizePackageName("@canonical//design-system")).toBe(
      "@canonical/design-system",
    );
  });
});
