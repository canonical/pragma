/**
 * The cross-capability shared surface — the few facts more than one capability
 * needs and none of them owns.
 *
 * Everything here earned its place by being needed in two capabilities at
 * once, and the cohesion principle is that shortness of the list. `shared/` is
 * not a utility drawer: a helper used by exactly one capability belongs in
 * that capability, and the moment something here has a single consumer again
 * it should move back. What survives is the environment the CLI reports on but
 * does not own — how it was installed, what the registry says about it,
 * whether a subprocess it ran actually succeeded — plus the one piece of
 * vocabulary (`BAND_LABELS`) that keeps `setup` and `doctor` calling the two
 * config bands by the same names users meet in the flags.
 *
 * The exec guard is exported as the pair a caller needs together: `checkExecOk`
 * to classify a result inside a Task and `assertExecOk` to throw on one
 * outside, with `guardMissingBinary` wrapping the absent-binary case that
 * neither should report as a pragma bug. The predicates they are built from
 * stay internal — a caller reaching for the predicate instead of the guard is
 * a caller about to reimplement the classification.
 */

export {
  assertExecOk,
  checkExecOk,
  guardMissingBinary,
} from "./assertExecOk.js";
export { BAND_LABELS } from "./bands.js";
export type { InstallSource } from "./packageManager.js";
export { detectInstallSource, pmUpdateCommand } from "./packageManager.js";
export type { RegistryCheckResult } from "./registry.js";
export { checkRegistryVersion, PRAGMA_PACKAGE } from "./registry.js";
