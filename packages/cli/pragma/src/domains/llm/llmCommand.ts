/**
 * `pragma llm` command definition.
 *
 * Outputs a structured orientation briefing for LLM agents:
 * context block, decision trees, and command reference.
 *
 * @see CL.07, LO.01–LO.07 in B.29.LLM_ORIENTATION
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import collectLlmContext from "./collectLlmContext.js";
import { COMMAND_REFERENCE, DECISION_TREES } from "./constants.js";
import renderLlmOrientation from "./renderLlmOrientation.js";
import type { LlmData } from "./types.js";

export default function buildLlmCommand(ctx: PragmaContext): CommandDefinition {
  return {
    path: ["llm"],
    description:
      "LLM orientation — context, decision trees, and command reference",
    parameters: [],
    execute: async (): Promise<CommandResult> => {
      const context = await collectLlmContext(ctx.store, ctx.config);
      const data: LlmData = {
        context,
        decisionTrees: DECISION_TREES,
        commandReference: COMMAND_REFERENCE,
      };
      return createOutputResult(data, { plain: renderLlmOrientation });
    },
  };
}
