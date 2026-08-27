/**
 * `@canonical/summon-core/projection/commander` — the Commander ADAPTER seam.
 *
 * The one registration path both binaries mount their generator grammar
 * through. Everything Commander-shaped lives here; the parser-agnostic data
 * half stays in `@canonical/summon-core/projection`. Every designed
 * non-action outcome (the two usage errors, the bare-namespace help) is
 * delivered to the host's required `emit` sink as a `MountOutcome` — the
 * adapter decides the bytes and the exit code, the host effects them, and
 * `emitToProcess` is the one shared default effect.
 *
 * IMPORT DISCIPLINE (pinned by `lazyGraph.test.ts`): this subpath's runtime
 * graph reaches only `commander` and Node built-ins — never react/ink/ejs/
 * chalk/@canonical/task, and never a summon-core module outside
 * `src/projection/` — so a host may import it statically on its
 * `--help`/`__complete` fast path.
 */

export { default as emitToProcess } from "./emitToProcess.js";
export type {
  CommanderHost,
  MountOutcome,
} from "./registerGeneratorCommands.js";
export { default as registerGeneratorCommands } from "./registerGeneratorCommands.js";
