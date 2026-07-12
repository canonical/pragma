import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { compileReadCommand } from "../../shared/stories/index.js";
import { configShowStory } from "../stories.js";

/** Wire the `pragma config show` CLI command from the config show story. */
export default function buildShowCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return compileReadCommand(ctx, configShowStory);
}
