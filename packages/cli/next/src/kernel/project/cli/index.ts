/**
 * CLI projector barrel — the Commander program, dispatcher, help, and
 * exit-code model. The bin composes these; tests build programs from arbitrary
 * modules via the `projectCli` helper.
 */

export type { BuildProgramOptions } from "./buildProgram.js";
export { buildProgram } from "./buildProgram.js";
export type { DispatchOutcome, MutationFlags } from "./dispatch.js";
export { dispatch, executeVerb, extractParams } from "./dispatch.js";
export { EXIT, mapExitCode } from "./exitCodes.js";
export type { OutputEnvironment } from "./globalFlags.js";
export {
  parseGlobalFlags,
  readRawFormat,
  stripGlobalFlags,
} from "./globalFlags.js";
export { formatRootHelp } from "./rootHelp.js";
export {
  nounVerbMap,
  resolveUnknownCommand,
  suggestMessage,
} from "./suggest.js";
export { suggestNames } from "./suggestNames.js";
export { formatNounHelp, formatVerbHelp } from "./verbHelp.js";
