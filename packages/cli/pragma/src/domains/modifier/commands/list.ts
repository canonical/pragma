import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { compileReadCommand } from "../../shared/stories/index.js";
import { modifierListStory } from "../stories.js";

/** Wire the `pragma modifier list` CLI command from the modifier list story. */
export default function listCommand(ctx: PragmaContext): CommandDefinition {
  return compileReadCommand(ctx, modifierListStory);
}
