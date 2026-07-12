import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { compileReadCommand } from "../../shared/stories/index.js";
import { skillListStory } from "../stories.js";

/** Wire the `pragma skill list` CLI command from the skill list story. */
export default function buildListCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return compileReadCommand(ctx, skillListStory);
}
