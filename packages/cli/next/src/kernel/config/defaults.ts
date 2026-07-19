/**
 * Built-in configuration defaults (D6 — TS, not JSON).
 *
 * The lowest config layer. Authored as a typed module so an invalid edit fails
 * at type-check rather than at runtime, and so the default `packages` sources
 * live in one place. Sources verified against the v1 `config/defaults.json`.
 */

import type { PragmaConfig } from "./types.js";

export default {
  channel: "normal",
  detail: "standard",
  packages: [
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
  ],
} satisfies PragmaConfig;
