import type { CommandDefinition } from "@canonical/cli-core";
import { commands as blockCommands } from "../domains/block/index.js";
import { buildCapabilitiesCommand } from "../domains/capabilities/index.js";
import { commands as configCommands } from "../domains/config/index.js";
import { commands as createCommands } from "../domains/create/index.js";
import { doctorCommand } from "../domains/doctor/commands/index.js";
import { commands as graphCommands } from "../domains/graph/index.js";
import { commands as graphqlCommands } from "../domains/graphql/index.js";
import { infoCommand, upgradeCommand } from "../domains/info/index.js";
import { buildLlmCommand } from "../domains/llm/index.js";
import { commands as modifierCommands } from "../domains/modifier/index.js";
import { commands as ontologyCommands } from "../domains/ontology/index.js";
import { commands as promptCommands } from "../domains/prompt/index.js";
import { commands as setupCommands } from "../domains/setup/index.js";
import type { PragmaContext } from "../domains/shared/context.js";
import {
  compilePackCommands,
  deriveReservedVerbs,
  nounVerbFromPath,
} from "../domains/shared/stories/pack/index.js";
import { commands as skillCommands } from "../domains/skill/index.js";
import { commands as tokenCommands } from "../domains/token/index.js";

/**
 * The built-in (hand-written domain) command surface, in emission order.
 *
 * Excludes story-pack commands (bundled, config, or package). Exported so the
 * reserved-verb derivation and its tests share the exact input production uses
 * — the reserved map is built from built-ins only, never from packs.
 */
export function builtInCommands(ctx: PragmaContext): CommandDefinition[] {
  return [
    ...configCommands(ctx),
    ...createCommands(),
    ...setupCommands(),
    ...modifierCommands(ctx),
    ...tokenCommands(ctx),
    ...blockCommands(ctx),
    ...ontologyCommands(ctx),
    ...graphCommands(ctx),
    ...graphqlCommands(),
    ...skillCommands(ctx),
    ...promptCommands(ctx),
    doctorCommand,
    infoCommand,
    upgradeCommand,
    buildLlmCommand(ctx),
    buildCapabilitiesCommand(ctx),
  ];
}

/**
 * Collect all CLI command definitions: built-in domains plus story packs.
 *
 * Extracted from runCli so the completions server can import the command list
 * independently without running the full CLI pipeline.
 *
 * Story packs (bundled transitional packs, plus config- and package-declared
 * stories) project onto the same surface. Leaf read nouns reserve only the
 * (noun, verb) pairs they own, so a pack can add a verb no built-in owns and,
 * once a built-in leaf is deleted, its bundled pack takes over the freed noun;
 * operational nouns (config, graph, setup, …) stay reserved wholesale.
 *
 * @param ctx - The pragma context providing store, config, and global flags.
 * @returns The full array of command definitions for all domains.
 */
export default function collectCommands(
  ctx: PragmaContext,
): CommandDefinition[] {
  const builtIn = builtInCommands(ctx);
  const reserved = deriveReservedVerbs(
    builtIn.map((command) => nounVerbFromPath(command.path)),
  );
  return [...builtIn, ...compilePackCommands(ctx, reserved)];
}
