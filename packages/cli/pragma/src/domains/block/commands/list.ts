import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { compileReadCommand } from "../../shared/stories/index.js";
import { blockListStory } from "../stories.js";

/** Wire the `pragma block list` CLI command from the block list story. */
export default function buildListCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return compileReadCommand(ctx, blockListStory);
}
