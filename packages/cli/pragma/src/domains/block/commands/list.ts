/**
 * Wires the `pragma block list` CLI command.
 *
 * Lists all blocks visible under the current tier and channel filters.
 * Supports progressive disclosure via `--digest` and `--detailed` flags,
 * and an `--all-tiers` flag to widen the search.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { createListView } from "#tui";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { blockConfig } from "../blockConfig.js";
import { listFormatters } from "../formatters/index.js";
import { resolveBlockList } from "../orchestration/index.js";

export default function buildListCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["block", "list"],
    description: "List blocks in the design system",
    parameters: [
      {
        name: "allTiers",
        description: "Show blocks from all tiers",
        type: "boolean",
        default: false,
      },
      {
        name: "digest",
        description: "Show enriched summary with implementations",
        type: "boolean",
        default: false,
      },
      {
        name: "detailed",
        description: "Show full details for each block",
        type: "boolean",
        default: false,
      },
    ],
    meta: {
      examples: [
        "pragma block list",
        "pragma block list --all-tiers",
        "pragma block list --digest",
        "pragma block list --detailed",
        "pragma block list --llm",
        "pragma block list --format json",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const contract = await resolveBlockList(ctx, {
        allTiers: params.allTiers === true,
        digest: params.digest === true,
        detailed: params.detailed === true,
      });

      return createOutputResult(contract.result.items, {
        plain: selectFormatter(ctx, listFormatters),
        ink: (data) =>
          createListView({
            heading: "Blocks",
            domain: "block",
            items: data,
            columns: blockConfig.listColumns.filter(
              (col) =>
                col.key !== "implementations" &&
                col.key !== "nodeCount" &&
                col.key !== "tokenCount",
            ),
          }),
      });
    },
  };
}
