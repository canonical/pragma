import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { compileLookupCommand } from "../../shared/stories/index.js";
import { standardLookupStory } from "../stories.js";

/**
 * Wire the `pragma standard lookup <name-or-uri...>` CLI command from the
 * standard lookup story.
 */
export default function buildLookupCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return compileLookupCommand(ctx, standardLookupStory);
}
