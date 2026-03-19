/**
 * Package generator command via generatorToCommand bridge.
 *
 * GN.03 — pragma create package
 * PA.13 — selective generator inclusion
 */

import {
  type CommandDefinition,
  generatorToCommand,
} from "@canonical/cli-core";
import { generators as packageGenerators } from "@canonical/summon-package";

export default function buildPackageCommand(): CommandDefinition {
  const gen = packageGenerators.package;
  if (!gen) {
    throw new Error("Package generator not found in @canonical/summon-package");
  }
  return generatorToCommand(["create", "package"], gen);
}
