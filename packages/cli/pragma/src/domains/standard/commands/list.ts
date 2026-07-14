import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { compileReadCommand } from "../../shared/stories/index.js";
import { standardListStory } from "../stories.js";

/** Wire the `pragma standard list` CLI command from the standard list story. */
export default function buildListCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return compileReadCommand(ctx, standardListStory);
}
