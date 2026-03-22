import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { COMMAND_REFERENCE, DECISION_TREES } from "../data/index.js";
import renderLlmOrientation from "../formatters/orientation.js";
import collectContext from "../operations/collectContext.js";
import type { LlmData } from "../types.js";

/**
 * Builds the `pragma llm` command definition.
 *
 * Produces an LLM orientation document containing live context (entity counts,
 * tier/channel), static decision trees, and a command reference table.
 *
 * @param ctx - Pragma runtime context providing the ke store and config.
 * @returns A command definition for `llm`.
 */
export default function buildLlmCommand(ctx: PragmaContext): CommandDefinition {
  return {
    path: ["llm"],
    description:
      "LLM orientation — context, decision trees, and command reference",
    parameters: [],
    execute: async (): Promise<CommandResult> => {
      const context = await collectContext(ctx.store, ctx.config);
      const data: LlmData = {
        context,
        decisionTrees: DECISION_TREES,
        commandReference: COMMAND_REFERENCE,
      };
      return createOutputResult(data, { plain: renderLlmOrientation });
    },
  };
}
