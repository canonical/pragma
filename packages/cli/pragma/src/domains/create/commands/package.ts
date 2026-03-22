import {
  type CommandDefinition,
  generatorToCommand,
} from "@canonical/cli-core";
import { generators as packageGenerators } from "@canonical/summon-package";

/**
 * Build the `pragma create package` command definition by bridging
 * the package generator via `generatorToCommand`.
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
  return generatorToCommand(["create", "package"], gen);
}
