/**
 * MCP tool specs for the tier domain — tier_list, compiled from the tier
 * read story in `../stories.ts`.
 */

import { compileReadTool } from "../../shared/stories/index.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import { tierListStory } from "../stories.js";

const specs: readonly ToolSpec[] = [compileReadTool(tierListStory)];

export default specs;
