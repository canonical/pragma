/**
 * The one constructor for a distribution-authored story origin.
 *
 * It lives in its own module rather than in `packs/types.ts`, where it was
 * declared, for two reasons that are the same reason. cs:code.types.file says a
 * `types.ts` holds types; and in THIS tree that file must also stay ERASABLE,
 * because `lazy.test.ts` pins `pragma.conf.ts`'s import graph to exactly
 * `[pragma.conf.ts, kernel/config/types.ts, kernel/packs/types.ts]` and asserts
 * every file on it has no value imports. A value export in a type file drags
 * importers into value-importing it — `project/mcp/prompts/source.ts` was
 * already writing `import { distributionOrigin, type PackRow }` — and the
 * walkers those guards use read `from "…"` textually, so they cannot tell that
 * edge from an erased one. Keeping the value out of `types.ts` keeps the
 * boundary the guards assume actually true.
 */

import type { StoryOrigin } from "./types.js";

/**
 * The origin of a query THIS BINARY writes, rather than one a story file
 * declares.
 *
 * One fact about the kernel with one writing. An unbound prefix in a query the
 * distribution composed means the store was never built from a pack that binds
 * the term, and `sources update` is the answer; the same condition under a
 * config- or package-declared story means the store IS built and the story names
 * a term it does not bind, which `sources update` cannot fix. `runSelect`
 * branches on exactly this, so every distribution-authored origin must be built
 * the same way — and before this helper existed they were three spellings: two
 * module constants carrying a word-for-word duplicated six-line docblock, and
 * one undocumented object literal at a call site.
 *
 * EVERY distribution-authored origin is built here. Two production sites remain
 * after the read nouns became declared content: the compile site
 * (`capabilities/distribution.ts`, which passes this to `compilePack` for each
 * story `pragma.conf.ts` declares) and `project/mcp/prompts/source.ts`, the one
 * SPARQL this binary still composes by hand. A helper that covered half its
 * sites would leave two spellings permanently and no rule for choosing between
 * them, which is the drift it exists to prevent. The one literal left in the
 * tree is in `sparql/runSelect.test.ts`, where a unit test building its own
 * origins by hand is the point.
 *
 * @param label - Human attribution for diagnostics; see {@link
 * StoryOrigin.label}. The distribution's own sites pass either the declaring
 * file (`pragma.conf.ts`) or, for the one composed query, the noun being read
 * (`prompt`).
 * @returns The distribution-authored origin.
 */
export const buildDistributionOrigin = (label: string): StoryOrigin => ({
  kind: "distribution",
  label,
});
