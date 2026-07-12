import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { compileReadCommand } from "../../shared/stories/index.js";
import { ontologyListStory } from "../stories.js";

/** Wire the `pragma ontology list` CLI command from the ontology list story. */
export default function buildListCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return compileReadCommand(ctx, ontologyListStory);
}
