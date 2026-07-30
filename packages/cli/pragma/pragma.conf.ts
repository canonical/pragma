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
  // This distribution's domain namespaces, declared once and read twice.
  //
  // (1) They pin what `sources update` builds the store with. The design system
  // declares `ds:` twice — `…/` in `definitions/` and `…/data/` in `data/` —
  // and prefix harvesting is last-wins over a filename sort, so which one binds
  // is an accident of file naming. The config layer wins every harvest: without
  // this pin an added or renamed upstream file can silently compact every `ds:`
  // entity to the wrong prefix, and `block list` stops resolving.
  //
  // (2) They are the domain half of the kernel's `DEFAULT_PREFIX_MAP`
  // (`src/kernel/render/prefixes.ts`) — what the CLI compacts in output AND
  // what it expands a user-typed `ds:Button` / `cs:rule` through before a
  // lookup. Drop a namespace here and its lookups stop resolving; that is why
  // `cs:` is listed even though nothing rebinds it upstream.
  prefixes: {
    ds: "https://ds.canonical.com/",
    cs: "http://pragma.canonical.com/codestandards#",
  },
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

/**
 * The domain terms the kernel reads this distribution's graph with.
 *
 * A separate export because it is NOT a config layer field: it is compiled in
 * and read at module load by `src/kernel/vocabulary.ts`, whose readers (the
 * storeless completion fast path, the pack index builder) cannot reach a config
 * layer at all. Layering it would let a project config set it and change
 * nothing. A fork edits these values and rebuilds; `parseVocabulary` type-checks
 * the shape and rejects a term that is not a prefixed name.
 *
 * Every prefix used here must be bound in `prefixes` above. `rdfs:label` and
 * `rdfs:comment` are deliberately absent — the kernel treats standard
 * vocabulary as universal.
 *
 * The `prompt` terms are a READ CONTRACT, not a claim about instances: this
 * distribution's graph currently carries no `ds:Prompt` entities at all, so
 * `prompt list` is honestly empty. Declaring the shape anyway is what makes an
 * empty result mean "the graph has none" rather than "nothing was declared".
 */
export const vocabulary = {
  altName: "ds:name",
  prompt: {
    type: "ds:Prompt",
    body: "ds:promptBody",
    argument: "ds:promptArgument",
    argName: "ds:argName",
    argRequired: "ds:argRequired",
  },
};
