import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
  type ParameterDefinition,
} from "@canonical/cli-core";
import type { PragmaContext } from "../context.js";
import type { LookupResult } from "../contracts.js";
import { renderLookupResults } from "../formatters.js";
import resolveLookupExitCode from "../resolveLookupExitCode.js";
import normalizeNames from "./normalizeNames.js";
import projectCliParameters from "./projectCliParameters.js";
import resolveLookupDetailed from "./resolveLookupDetailed.js";
import type { LookupStory, LookupStoryView } from "./types.js";

/**
 * Compile a lookup story into its CLI `CommandDefinition` projection.
 *
 * Owns the shared execute skeleton: normalize the positional `names`,
 * reject empty input when the story defines an error, resolve the batch,
 * then render each result through the story's formatters with the shared
 * multi-result renderer (which appends the "Errors:" section).
 */
export default function compileLookupCommand<TDetailed, TFmtInput>(
  ctx: PragmaContext,
  story: LookupStory<TDetailed, TFmtInput>,
): CommandDefinition {
  interface LookupOutput {
    readonly result: LookupResult<TDetailed>;
    readonly view: LookupStoryView;
  }

  return {
    path: [story.noun, "lookup"],
    description: story.description,
    parameters: buildParameters(story),
    ...(story.parameterGroups && { parameterGroups: story.parameterGroups }),
    meta: {
      examples: story.examples,
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const names = normalizeNames(params.names, params.name);
      if (names.length === 0 && story.emptyNamesError) {
        throw story.emptyNamesError();
      }

      const view: LookupStoryView = {
        surface: "cli",
        detailed: resolveLookupDetailed(story, "cli", params),
        params,
      };
      const result = await story.resolve(ctx, names, params);
      const renderInk = story.renderInk;

      return createOutputResult<LookupOutput>(
        { result, view },
        {
          plain: (output) =>
            renderLookupResults({
              ctx,
              result: output.result,
              formatters: story.formatters,
              mapResult: (entity) => story.toFmtInput(entity, output.view),
            }),
          ...(renderInk && {
            ink: (output: LookupOutput) =>
              renderInk(output.result, output.view),
          }),
        },
        resolveLookupExitCode(result),
      );
    },
  };
}

function buildParameters<TDetailed, TFmtInput>(
  story: LookupStory<TDetailed, TFmtInput>,
): ParameterDefinition[] {
  const names: ParameterDefinition = {
    name: "names",
    description: story.namesDescription,
    type: "multiselect",
    positional: true,
    required: true,
    ...(story.complete && { complete: story.complete }),
  };

  const detailed: ParameterDefinition[] = story.detailedParam
    ? [
        {
          name: "detailed",
          description: story.detailedParam.description,
          type: "boolean",
          default: false,
        },
      ]
    : [];

  return [names, ...detailed, ...projectCliParameters(story.params ?? [])];
}
