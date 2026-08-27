/**
 * The setup operations — one module per installable target, each answering the
 * same three questions about it.
 *
 * `setup` and `doctor` are two projections of ONE target table, and this is
 * where that table's cells live. Every target module exports the same trio: a
 * `detect*` that reads the machine and returns that target's detection record,
 * a `compose*` that turns a detection into the Task which installs it, and a
 * `compose*Removal` that turns the same detection into the Task which undoes
 * it. Nothing here decides WHICH targets run or in what order — `targets.ts`
 * owns that — so a new target is a new module plus a row, and neither surface
 * has to learn about it twice.
 *
 * The detection types are part of the surface, not an implementation leak: a
 * detection is the value passed from the read half to the compose half and on
 * to the plan rows, so `doctor`'s banded checks name the same records `setup`
 * acts on. The presentation helpers travel with them for the same reason — a
 * skip reason or an uninstall remedy is derived from one detection, and
 * deriving it twice is how the two surfaces start disagreeing about the same
 * machine.
 *
 * `buildSetupRun` sits apart: it is the run assembler that drives every
 * selected target's detection and projects the result into a plan and a summon
 * generator. It is reached through a DYNAMIC import from `setup.verb.ts` so
 * the wizard's React/Ink dependency stays off the `--help`/`__complete` fast
 * path — a consumer that routes it through this barrel statically would undo
 * that, and the setup guard test would say so.
 *
 * Deliberately internal: the config seed literal, the per-target message
 * builders, and the MCP entry writer. They are inputs to the composers above,
 * not operations a caller performs.
 */

export type { CompletionsDetection } from "./setupCompletions.js";
export {
  composeCompletions,
  composeCompletionsRemoval,
  detectCompletions,
} from "./setupCompletions.js";
export type { ConfigDetection } from "./setupConfig.js";
export {
  composeConfigFile,
  composeConfigRemoval,
  detectConfigFile,
} from "./setupConfig.js";
export type { SetupRun } from "./setupGenerator.js";
export { buildSetupRun } from "./setupGenerator.js";
export type { LspDetection } from "./setupLsp.js";
export {
  composeLsp,
  composeLspRemoval,
  detectLsp,
  LSP_SKIP_REMEDY,
  lspEditorNames,
  lspSkipReason,
  lspUninstallRemedy,
} from "./setupLsp.js";
export type { McpDetection } from "./setupMcp.js";
export {
  composeMcp,
  composeMcpRemoval,
  detectMcp,
  mcpGroupState,
  ownedMcpGroups,
  selectedGroups,
} from "./setupMcp.js";
export type { SkillsDetection, SymlinkAction } from "./setupSkills.js";
export {
  composeSkills,
  composeSkillsRemoval,
  detectSkills,
  ownedSkillLinks,
  skillsSkipReason,
} from "./setupSkills.js";
