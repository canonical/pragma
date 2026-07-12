import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { compileReadCommand } from "../../shared/stories/index.js";
import { tierListStory } from "../stories.js";

/** Wire the `pragma tier list` CLI command from the tier list story. */
export default function listCommand(ctx: PragmaContext): CommandDefinition {
  return compileReadCommand(ctx, tierListStory);
}
