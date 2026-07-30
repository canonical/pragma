/**
 * The pragma distribution config — identity, default packs, and generators.
 *
 * Consumed twice: statically imported by `src/kernel/config/defaults.ts` as the
 * lowest config layer (compiled into the binary — no fs), and at build time by
 * the bundler (PR 2). A NON-magic name on purpose: `findProjectConfig` only
 * discovers `pragma.config.{ts,js}`, so this file is never mistaken for a
 * project config. Validated by the same `parseRawConfig` as every layer.
 */

import type { RawConfig } from "./src/kernel/config/types.js";

export default {
  name: "pragma",
  help: "Explore the design system",
  colophon: "Made by the Canonical Webteam — https://canonical.com.",
  issuesUrl: "https://github.com/canonical/pragma/issues",
  packs: [
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
  // The design system declares `ds:` twice — `…/` in `definitions/` and
  // `…/data/` in `data/` — and prefix harvesting is last-wins over a filename
  // sort, so which one binds is an accident of file naming. Pinning it here
  // puts `ds:` in the config layer, which wins every harvest: without this an
  // added or renamed upstream file can silently compact every `ds:` entity to
  // the wrong prefix, and `block list` stops resolving.
  prefixes: { ds: "https://ds.canonical.com/" },
  generators: [
    {
      name: "@canonical/summon-component",
      source: "npm:@canonical/summon-component@^0.33.0",
    },
    {
      name: "@canonical/summon-package",
      source: "npm:@canonical/summon-package@^0.33.0",
    },
    {
      name: "@canonical/summon-application",
      source: "npm:@canonical/summon-application@^0.33.0",
    },
  ],
  channel: "normal",
  detail: "standard",
} satisfies RawConfig;
