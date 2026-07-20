/**
 * Completion kernel barrel — the shared model, the `__complete` resolver
 * pipeline (parse → resolve → rank), the static script emitter, and the
 * dynamic-tier entity seam. Both tiers are driven off the grammar via
 * `buildCompletionModel`, so they can never disagree.
 */

export type {
  AutocompleteHeuristic,
  CompletionFrom,
  CompletionMatch,
  CompletionSourceRef,
} from "../spec/types.js";
export { runComplete } from "./complete.js";
export { emitScripts } from "./emitScripts.js";
export {
  createIndexEntityReader,
  emptyNameSource,
  indexCompletionEnv,
} from "./entitySource.js";
export {
  assertSafeToken,
  buildCompletionModel,
  findNoun,
  SAFE_TOKEN_RE,
} from "./model.js";
export { parseWords } from "./parse.js";
export { filterPrefix, MAX_CANDIDATES, rankCandidates } from "./rank.js";
export { completionDebug, resolveRequest } from "./resolve.js";
export type {
  Candidate,
  CompletionContext,
  CompletionEnv,
  CompletionModel,
  CompletionRequest,
  CompletionSource,
  FlagEntry,
  NounEntry,
  PositionalEntry,
  Shell,
  VerbEntry,
} from "./types.js";
