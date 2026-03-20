/**
 * `pragma standard list` command definition.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "../../../error/index.js";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { listFormatters } from "../formatters/index.js";
import { listStandards } from "../operations/index.js";

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
    ],
    meta: {
      examples: [
        "pragma standard list",
        "pragma standard list --category react",
        'pragma standard list --search "folder"',
        "pragma standard list --llm",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const filters = {
        category: params.category as string | undefined,
        search: params.search as string | undefined,
      };

      const standards = await listStandards(ctx.store, filters);

      if (standards.length === 0) {
        throw PragmaError.emptyResults("standards", {
          filters: buildActiveFilters(filters),
          recovery: "Run `pragma standard list` to see all standards.",
        });
      }

      return createOutputResult(standards, {
        plain: selectFormatter(ctx, listFormatters),
      });
    },
  };
}

function buildActiveFilters(filters: {
  category?: string;
  search?: string;
}): Record<string, string> | undefined {
  const active: Record<string, string> = {};
  if (filters.category) active.category = filters.category;
  if (filters.search) active.search = filters.search;
  return Object.keys(active).length > 0 ? active : undefined;
}
