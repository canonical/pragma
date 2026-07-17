/**
 * Test helper: build a Commander program from arbitrary capability modules.
 *
 * Lets a test project any set of modules (fixtures or real capabilities) into a
 * CLI without the bin's global-flag/first-run machinery, so the projector can
 * be exercised in isolation.
 */

import type { Command } from "commander";
import { buildProgram } from "../../kernel/project/cli/buildProgram.js";
import type { GlobalFlags } from "../../kernel/runtime/types.js";
import type { CapabilityModule, VerbSpec } from "../../kernel/spec/types.js";

/** Neutral global flags for a plain-text, non-agent invocation. */
export const TEST_FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};

/**
 * Build a program from the given modules' verbs.
 *
 * @param modules - Capability modules whose verbs are projected.
 * @param globalFlags - Global flags to close over (defaults to {@link TEST_FLAGS}).
 * @returns The configured Commander program.
 */
export function projectCli(
  modules: readonly CapabilityModule[],
  globalFlags: GlobalFlags = TEST_FLAGS,
): Command {
  const verbs: VerbSpec[] = modules.flatMap((module) => [...module.verbs]);
  return buildProgram(verbs, { globalFlags, programName: "pragma2" });
}
