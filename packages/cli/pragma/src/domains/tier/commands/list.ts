import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "../../../error/index.js";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { listFormatters } from "../formatters/index.js";
import { listTiers } from "../operations/index.js";

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
          recovery:
            "Ensure design system packages are installed: bun add -D @canonical/ds-global",
        });
      }

      return createOutputResult(tiers, {
        plain: selectFormatter(ctx, listFormatters),
      });
    },
  };
}
