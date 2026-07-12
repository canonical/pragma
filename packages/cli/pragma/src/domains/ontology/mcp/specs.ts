/**
 * MCP tool specs for the ontology domain — ontology_list and
 * ontology_show, compiled from the ontology read stories in
 * `../stories.ts` so both surfaces share formatters and resolution.
 */

import { compileReadTool } from "../../shared/stories/index.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import { ontologyListStory, ontologyShowStory } from "../stories.js";

const specs: readonly ToolSpec[] = [
  compileReadTool(ontologyListStory),
  compileReadTool(ontologyShowStory),
];

export default specs;
