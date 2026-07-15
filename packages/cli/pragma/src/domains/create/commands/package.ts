import {
  type CommandDefinition,
  generatorToCommand,
} from "@canonical/cli-core";
import { generators as packageGenerators } from "@canonical/summon-package";
import renderGeneratorUi from "../renderGeneratorUi.js";

/**
 * Build the `pragma create package` command definition.
 *
 * Reuses `generatorToCommand` for the parameter/help projection, then swaps in
 * an execute that routes through {@link renderGeneratorUi} so an interactive run
 * gets summon's rich Ink UI while batch/machine modes keep the UI-free path.
 *
 * @returns The command definition for `pragma create package`.
 * @throws Error if the package generator is not found.
 * @note Impure
 */
export default function buildPackageCommand(): CommandDefinition {
  const gen = packageGenerators.package;
  if (!gen) {
    throw new Error("Package generator not found in @canonical/summon-package");
  }
  const command = generatorToCommand(["create", "package"], gen);
  return {
    ...command,
    execute: (params, ctx) => renderGeneratorUi(gen, params, ctx),
  };
}
