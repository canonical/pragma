import { lookupToolMeta } from "../lookupMany.js";
import type { ToolParamDef, ToolSpec } from "../ToolSpec.js";
import condense from "./condense.js";
import projectToolParams from "./projectToolParams.js";
import resolveLookupDetailed from "./resolveLookupDetailed.js";
import type { LookupStory, LookupStoryView } from "./types.js";

/**
 * Compile a lookup story into its MCP `ToolSpec` projection.
 *
 * The tool is named `<noun>_lookup` and takes a required `names` array.
 * Condensed responses render each entity through the story's llm
 * formatter and append a `### Errors` section for failed queries. When
 * the story supports `detailed` (MCP default: true), a false value
 * applies the story's summary projection to each result.
 */
export default function compileLookupTool<TDetailed, TFmtInput>(
  story: LookupStory<TDetailed, TFmtInput>,
): ToolSpec {
  return {
    name: `${story.noun}_lookup`,
    description: story.toolDescription,
    params: buildParams(story),
    readOnly: true,
    async execute(rt, params) {
      const names = (params.names as string[] | undefined) ?? [];
      const view: LookupStoryView = {
        surface: "mcp",
        detailed: resolveLookupDetailed(story, "mcp", params),
        params,
      };
      const result = await story.resolve(rt, names, params);

      if (params.condensed) {
        const textParts = result.results.map((entity) =>
          story.formatters.llm(story.toFmtInput(entity, view)),
        );

        if (result.errors.length > 0) {
          textParts.push(
            [
              "### Errors",
              ...result.errors.map(
                (error) => `- ${error.query}: ${error.message}`,
              ),
            ].join("\n"),
          );
        }

        return condense(textParts.join("\n\n"));
      }

      const project = story.project;
      const results =
        !view.detailed && project
          ? result.results.map((entity) => project(entity))
          : result.results;

      return {
        data: { results, errors: result.errors },
        meta: lookupToolMeta(result),
      };
    },
  };
}

function buildParams<TDetailed, TFmtInput>(
  story: LookupStory<TDetailed, TFmtInput>,
): Record<string, ToolParamDef> {
  const detailed: Record<string, ToolParamDef> = story.detailedParam
    ? {
        detailed: {
          type: "boolean",
          description:
            story.detailedParam.toolDescription ??
            story.detailedParam.description,
          optional: true,
        },
      }
    : {};

  return {
    names: {
      type: "string[]",
      description: story.namesToolDescription ?? story.namesDescription,
      optional: false,
    },
    ...detailed,
    ...projectToolParams(story.params ?? []),
    condensed: {
      type: "boolean",
      description: "Token-optimized output",
      optional: true,
    },
  };
}
