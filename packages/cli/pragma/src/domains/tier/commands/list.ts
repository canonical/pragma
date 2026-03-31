/**
 * Wires the `pragma tier list` CLI command.
 *
 * Lists all tiers defined in the design system ontology. Throws a
 * structured recovery error when no tiers are found.
 */

import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import { createListView } from "#tui";
import type { PragmaContext } from "../../shared/context.js";
import type { ColumnDef } from "../../shared/contracts.js";
import { selectFormatter } from "../../shared/formatters.js";
import type { TierEntry } from "../../shared/types/tier.js";
import { listFormatters } from "../formatters/index.js";
import { listTiers } from "../operations/index.js";

const tierListColumns: readonly ColumnDef<TierEntry>[] = [
  { key: "uri", label: "IRI" },
  { key: "path", label: "Path" },
  { key: "parent", label: "Parent" },
];

export default function listCommand(ctx: PragmaContext): CommandDefinition {
  return {
    path: ["tier", "list"],
    description: "List all tiers in the design system ontology",
    parameters: [],
    meta: {
      examples: ["pragma tier list", "pragma tier list --llm"],
    },
    async execute() {
      const tiers = await listTiers(ctx.store);

      if (tiers.length === 0) {
        throw PragmaError.emptyResults("tier", {
          recovery: {
            message:
              "Ensure design system packages are installed: bun add -D @canonical/ds-global",
          },
        });
      }

      return createOutputResult(tiers, {
        plain: selectFormatter(ctx, listFormatters),
        ink: (data) =>
          createListView({
            heading: "Tiers",
            domain: "tier",
            items: data,
            columns: tierListColumns,
          }),
      });
    },
  };
}
