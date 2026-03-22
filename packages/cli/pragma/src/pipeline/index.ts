/** @module CLI pipeline — program construction, flag parsing, error rendering, and command routing. */
export { default as collectCommands } from "./collectCommands.js";
export { default as createProgram } from "./createProgram.js";
export {
  formatField,
  formatHeading,
  formatList,
  formatSection,
} from "./formatTerminal.js";
export { default as mapExitCode } from "./mapExitCode.js";
export { default as parseGlobalFlags } from "./parseGlobalFlags.js";
export {
  renderErrorJson,
  renderErrorLlm,
  renderErrorPlain,
} from "./renderError.js";
export { default as resolveCommandKind } from "./resolveCommandKind.js";
export { default as runCli } from "./runCli.js";
export type { CommandKind } from "./types.js";
