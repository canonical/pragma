/**
 * Collect all CLI command definitions from domain modules.
 *
 * Extracted from runCli so the completions server can import independently.
 */

import type { CommandDefinition } from "@canonical/cli-core";
import { commands as blockCommands } from "../domains/block/index.js";
import { commands as configCommands } from "../domains/config/index.js";
import { commands as createCommands } from "../domains/create/index.js";
import { doctorCommand } from "../domains/doctor/commands/index.js";
import { commands as graphCommands } from "../domains/graph/index.js";
import { infoCommand, upgradeCommand } from "../domains/info/index.js";
import { buildLlmCommand } from "../domains/llm/index.js";
import { commands as modifierCommands } from "../domains/modifier/index.js";
import { commands as ontologyCommands } from "../domains/ontology/index.js";
import { commands as setupCommands } from "../domains/setup/index.js";
import type { PragmaContext } from "../domains/shared/context.js";
import { commands as skillCommands } from "../domains/skill/index.js";
import { commands as standardCommands } from "../domains/standard/index.js";
import { commands as tierCommands } from "../domains/tier/index.js";
import { commands as tokenCommands } from "../domains/token/index.js";

export default function collectCommands(
  ctx: PragmaContext,
): CommandDefinition[] {
  return [
    ...configCommands(ctx),
    ...createCommands(),
    ...setupCommands(),
    ...standardCommands(ctx),
    ...modifierCommands(ctx),
    ...tierCommands(ctx),
    ...tokenCommands(ctx),
    ...blockCommands(ctx),
    ...ontologyCommands(ctx),
    ...graphCommands(ctx),
    ...skillCommands(ctx),
    doctorCommand,
    infoCommand,
    upgradeCommand,
    buildLlmCommand(ctx),
  ];
}
