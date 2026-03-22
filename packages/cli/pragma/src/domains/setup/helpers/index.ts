/** @module Shared helpers for setup commands: shell detection, completion scripts, and task execution. */
export {
  completionScriptContent,
  completionScriptPath,
  postInstallHint,
} from "./completionScripts.js";
export { MCP_SERVER_NAME } from "./constants.js";
export { default as detectShell, type ShellId } from "./detectShell.js";
export {
  default as runSetupTask,
  type SetupTaskOptions,
} from "./runSetupTask.js";
