import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import type { PragmaContext } from "../context.js";
import { selectFormatter } from "../formatters.js";
import projectCliParameters from "./projectCliParameters.js";
import type { ReadStory } from "./types.js";

/**
 * Compile a read story into its CLI `CommandDefinition` projection.
 *
 * Owns the shared execute skeleton: guard parameters, resolve, reject
 * empty results when the story defines a guard, then render through the
 * story's formatters (plain/llm/json via global flags) and optional ink
 * view.
 */
export default function compileReadCommand<TData, TOutput>(
  ctx: PragmaContext,
  story: ReadStory<TData, TOutput>,
): CommandDefinition {
  return {
    path: [story.noun, story.verb],
    description: story.description,
    parameters: projectCliParameters(story.params),
    meta: {
      examples: story.examples,
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const guardError = story.guardParams?.(params);
      if (guardError) throw guardError;

      const data = await story.resolve(ctx, params);

      const emptyError = story.emptyError?.(data, params);
      if (emptyError) throw emptyError;

      const renderInk = story.renderInk;
      return createOutputResult(story.toOutput(data, params), {
        plain: selectFormatter(ctx, story.formatters),
        ...(renderInk && { ink: (output: TOutput) => renderInk(output) }),
      });
    },
  };
}
