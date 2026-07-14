import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { compileLookupCommand } from "../../shared/stories/index.js";
import { modifierLookupStory } from "../stories.js";

/**
 * Wire the `pragma modifier lookup <name...>` CLI command from the
 * modifier lookup story.
 */
export default function buildLookupCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return compileLookupCommand(ctx, modifierLookupStory);
}
