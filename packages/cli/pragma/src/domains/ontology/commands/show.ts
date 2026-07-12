import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { compileReadCommand } from "../../shared/stories/index.js";
import { ontologyShowStory } from "../stories.js";

/**
 * Wire the `pragma ontology show <prefix>` CLI command from the ontology
 * show story.
 */
export default function buildShowCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return compileReadCommand(ctx, ontologyShowStory);
}
