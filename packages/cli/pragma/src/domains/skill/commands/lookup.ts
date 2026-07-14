import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { compileLookupCommand } from "../../shared/stories/index.js";
import { skillLookupStory } from "../stories.js";

/**
 * Wire the `pragma skill lookup <name...>` CLI command from the skill
 * lookup story.
 */
export default function buildLookupCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return compileLookupCommand(ctx, skillLookupStory);
}
