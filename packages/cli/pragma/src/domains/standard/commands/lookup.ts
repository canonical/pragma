/**
 * Wires the `pragma standard lookup <name>` CLI command.
 *
 * Retrieves detailed information for a single code standard, including
 * optional dos/donts code blocks when `--detailed` is passed.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { lookupFormatters } from "../formatters/index.js";
import { lookupStandard } from "../operations/index.js";

export default function buildLookupCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["standard", "lookup"],
    description: "Look up detailed information for a standard",
    parameters: [
      {
        name: "name",
        description: "Standard name (e.g., react/component/folder-structure)",
        type: "string",
        positional: true,
        required: true,
      },
      {
        name: "detailed",
        description: "Include dos and donts with code blocks",
        type: "boolean",
        default: false,
      },
    ],
    meta: {
      examples: [
        "pragma standard lookup react/component/folder-structure",
        "pragma standard lookup react/component/folder-structure --detailed",
        "pragma standard lookup react/component/folder-structure --llm",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const name = params.name as string;
      const detailed = (params.detailed as boolean) ?? false;
      const standard = await lookupStandard(ctx.store, name);

      return createOutputResult(
        { standard, detailed },
        {
          plain: selectFormatter(ctx, lookupFormatters),
        },
      );
    },
  };
}
