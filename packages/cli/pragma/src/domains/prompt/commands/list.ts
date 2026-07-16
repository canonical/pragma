import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { collectToolSpecs } from "../../../mcp/tools/index.js";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import collectPrompts from "../collectPrompts.js";
import { listFormatters } from "../formatters/index.js";
import projectPromptList from "../projectPromptList.js";

/**
 * Build the `pragma prompt list` command definition.
 *
 * MIRROR INVARIANT: `--format json` emits the exact `prompts/list`
 * protocol payload (`{"prompts":[...]}` — the same objects the MCP SDK
 * serves). The text table is a view rendered FROM that payload.
 *
 * @param ctx - Pragma context providing config, packages, and flags.
 * @returns The command definition for `pragma prompt list`.
 * @note - Impure — discovers skill stubs on disk.
 */
export default function buildPromptListCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["prompt", "list"],
    description: "List available prompts (MCP prompts surface)",
    parameters: [],
    meta: {
      examples: ["pragma prompt list", "pragma prompt list --format json"],
    },
    execute: async (): Promise<CommandResult> => {
      const registry = await collectPrompts(ctx, collectToolSpecs(ctx));
      const payload = projectPromptList(registry);
      const format = selectFormatter(ctx, listFormatters);
      return createOutputResult(payload, { plain: format });
    },
  };
}
