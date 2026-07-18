/**
 * Emit the static shell-completion scripts from the grammar.
 *
 * Builds the completion model from the capability modules (the same source the
 * surface is emitted from) and renders one script per supported shell.
 * `setup completions` (PR6+) installs the output; PR1 exposes the emitter and
 * the resolver so the completion contract is testable now.
 */

import type { CapabilityModule } from "../spec/types.js";
import { buildCompletionModel } from "./complete.js";
import { bashScript, fishScript, zshScript } from "./templates.js";

/** The supported completion shells. */
export type Shell = "bash" | "zsh" | "fish";

/**
 * Emit the completion scripts for every supported shell.
 *
 * @param modules - The capability modules to derive completions from.
 * @returns A map of shell to its completion script.
 */
export function emitScripts(
  modules: readonly CapabilityModule[],
): Record<Shell, string> {
  const model = buildCompletionModel(modules);
  return {
    bash: bashScript(model),
    zsh: zshScript(model),
    fish: fishScript(model),
  };
}
