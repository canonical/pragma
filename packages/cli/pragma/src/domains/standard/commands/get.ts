/**
 * `pragma standard get <name>` command definition.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { getFormatters } from "../formatters/index.js";
import { getStandard } from "../operations/index.js";

export default function buildGetCommand(ctx: PragmaContext): CommandDefinition {
  return {
    path: ["standard", "get"],
    description: "Get detailed information for a standard",
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
        "pragma standard get react/component/folder-structure",
        "pragma standard get react/component/folder-structure --detailed",
        "pragma standard get react/component/folder-structure --llm",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const name = params.name as string;
      const detailed = (params.detailed as boolean) ?? false;
      const standard = await getStandard(ctx.store, name);

      return createOutputResult(
        { standard, detailed },
        {
          plain: selectFormatter(ctx, getFormatters),
        },
      );
    },
  };
}
