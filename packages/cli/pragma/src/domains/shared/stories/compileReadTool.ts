import type { ToolSpec } from "../ToolSpec.js";
import condense from "./condense.js";
import projectToolParams from "./projectToolParams.js";
import type { ReadStory } from "./types.js";

/**
 * Compile a read story into its MCP `ToolSpec` projection.
 *
 * The tool is named `<noun>_<verb>`. A `condensed` parameter is appended
 * uniformly; condensed responses render through the story's llm formatter,
 * so CLI `--llm` output and MCP condensed output agree by construction.
 */
export default function compileReadTool<TData, TOutput>(
  story: ReadStory<TData, TOutput>,
): ToolSpec {
  return {
    name: `${story.noun}_${story.verb}`,
    description: story.toolDescription,
    params: {
      ...projectToolParams(story.params),
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, params) {
      const data = await story.resolve(rt, params);

      if (params.condensed) {
        return condense(story.formatters.llm(story.toOutput(data, params)));
      }

      return story.toEnvelope(data);
    },
  };
}
