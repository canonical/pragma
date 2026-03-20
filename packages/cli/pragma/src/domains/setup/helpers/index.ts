export {
  completionScriptContent,
  completionScriptPath,
  postInstallHint,
} from "./completionScripts.js";
export { LSP_SETTINGS, MCP_SERVER_NAME } from "./constants.js";
export { default as detectShell, type ShellId } from "./detectShell.js";
export {
  default as runSetupTask,
  type SetupTaskOptions,
} from "./runSetupTask.js";
