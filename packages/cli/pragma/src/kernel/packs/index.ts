/**
 * The packs domain — declared stories become runnable verbs.
 *
 * One pipeline runs end to end inside this folder: a JSON pack declaration is
 * parsed and validated, compiled into `VerbSpec`s, and given run bodies that
 * resolve entities out of the graph and formatters that render them. The
 * intermediate stages — the schema parser, the query/render/run-body builders,
 * the entity resolver, the sampler, the glob expander — are steps in that
 * pipeline, not services, and they stay off this barrel: a caller reaching for
 * one of them is a caller reassembling the pipeline by hand, and the whole
 * point of compiling a pack once is that nobody has to.
 *
 * What crosses the boundary is the pipeline's ends and the contracts naming
 * them. `compilePack` is the entry the distribution and the config-story path
 * both take. `validateStories` and `loadEffectiveModules` are the two ways
 * third-party stories are admitted — the first screens records and reports
 * every problem (which is how `doctor` reports a story the CLI drops rather
 * than letting it vanish), the second is the full load the MCP server and the
 * `capabilities` verb take. `resolvePackDetail` and `resolveUri` are the two
 * decisions a pack's own reads defer to the runtime, and `verbKey` is the
 * identity function every surface keys a verb by.
 *
 * `loadEffectiveModules` reads config and the answering pack behind DYNAMIC
 * imports so a bare `--help` never pays for either; consumers reach it lazily
 * today for exactly that reason, and routing it through this barrel statically
 * would put the config reader back on the fast path.
 */

export type { StoryProblem } from "./collect.js";
export { loadEffectiveModules, validateStories } from "./collect.js";
export { compilePack } from "./compile.js";
export { resolvePackDetail } from "./disclosure.js";
export { resolveUri } from "./iri.js";
export type {
  PackDefinition,
  PackRow,
  StorySource,
} from "./types.js";
export { distributionSource } from "./types.js";
export { verbKey } from "./uniqueness.js";
