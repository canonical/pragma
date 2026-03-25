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
import { PragmaError } from "#error";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import type { Disclosure, StandardDetailed } from "../../shared/types.js";
import { listFormatters } from "../formatters/index.js";
import type { StandardListOutput } from "../formatters/types.js";
import { listStandards, lookupStandard } from "../operations/index.js";

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
      const filters = {
        category: params.category as string | undefined,
        search: params.search as string | undefined,
      };

      const standards = await listStandards(ctx.store, filters);

      if (standards.length === 0) {
        throw PragmaError.emptyResults("standard", {
          filters: buildActiveFilters(filters),
          recovery: {
            message: "List all standards without filters.",
            cli: "pragma standard list",
            mcp: { tool: "standard_list" },
          },
        });
      }

      const disclosure: Disclosure = params.detailed
        ? { level: "detailed" }
        : params.digest
          ? { level: "digest" }
          : { level: "summary" };

      let details: (StandardDetailed | null)[] | undefined;

      if (disclosure.level !== "summary") {
        details = await Promise.all(
          standards.map((s) =>
            lookupStandard(ctx.store, s.name).catch(() => null),
          ),
        );
      }

      const output: StandardListOutput = {
        items: standards,
        details,
        disclosure,
      };

      return createOutputResult(output, {
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
