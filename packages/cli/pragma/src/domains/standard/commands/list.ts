/**
 * Wires the `pragma standard list` CLI command.
 *
 * Lists all code standards with optional category and search filters.
 * Supports progressive disclosure via `--digest` (summary + first example)
 * and `--detailed` (full dos/donts) flags.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { createListView } from "#tui";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { listFormatters } from "../formatters/index.js";
import type { StandardListOutput } from "../formatters/types.js";
import { resolveStandardList } from "../orchestration/index.js";
import { standardConfig } from "../standardConfig.js";

export default function buildListCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["standard", "list"],
    description: "List all code standards",
    parameters: [
      {
        name: "category",
        description: "Filter by category",
        type: "string",
      },
      {
        name: "search",
        description: "Search in name and description",
        type: "string",
      },
      {
        name: "digest",
        description: "Show description and first example for each standard",
        type: "boolean",
        default: false,
      },
      {
        name: "detailed",
        description: "Show full dos/donts for each standard",
        type: "boolean",
        default: false,
      },
    ],
    meta: {
      examples: [
        "pragma standard list",
        "pragma standard list --category react",
        'pragma standard list --search "folder"',
        "pragma standard list --digest",
        "pragma standard list --detailed",
        "pragma standard list --llm",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const contract = await resolveStandardList(ctx, {
        category: params.category as string | undefined,
        search: params.search as string | undefined,
        digest: params.digest === true,
        detailed: params.detailed === true,
      });

      const output: StandardListOutput = {
        items: contract.items,
        details: contract.details,
        disclosure: contract.disclosure,
      };

      return createOutputResult(output, {
        plain: selectFormatter(ctx, listFormatters),
        ink: (data) =>
          createListView({
            heading: "Standards",
            domain: "standard",
            items: data.items,
            columns: standardConfig.listColumns,
          }),
      });
    },
  };
}
