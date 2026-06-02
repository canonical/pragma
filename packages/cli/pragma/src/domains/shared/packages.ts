/**
 * Default semantic graph package registry.
 *
 * Defines the default graph packages loaded when no config overrides
 * are present. Each entry is a git ref pointing to the canonical
 * repository so `pragma update-refs` fetches data out of the box.
 *
 * Resolution is handled by the loader chain in `loaders/`.
 */

import type { RawPackageEntry } from "../refs/operations/parseRef.js";

/** Default semantic graph packages loaded when no config overrides are present. */
export const DEFAULT_PACKAGES: readonly RawPackageEntry[] = [
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
    source: "git+https://github.com/canonical/web-code-standards.git#main",
  },
];
