import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { compileLookupCommand } from "../../shared/stories/index.js";
import { blockLookupStory } from "../stories.js";

/**
 * Wire the `pragma block lookup <name-or-uri...>` CLI command from the
 * block lookup story.
 */
export default function buildLookupCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return compileLookupCommand(ctx, blockLookupStory);
}
