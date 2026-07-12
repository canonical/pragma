/**
 * MCP tool specs for the skill domain — skill_list and skill_lookup,
 * compiled from the skill read stories in `../stories.ts`. skill_lookup
 * serves full SKILL.md content so agents can load skills over MCP.
 */

import {
  compileLookupTool,
  compileReadTool,
} from "../../shared/stories/index.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import { skillListStory, skillLookupStory } from "../stories.js";

const specs: readonly ToolSpec[] = [
  compileReadTool(skillListStory),
  compileLookupTool(skillLookupStory),
];

export default specs;
