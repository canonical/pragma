import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "../../../error/index.js";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { listFormatters } from "../formatters/index.js";
import { listModifiers } from "../operations/index.js";

export default function listCommand(ctx: PragmaContext): CommandDefinition {
  return {
    path: ["modifier", "list"],
    description: "List all modifier families",
    parameters: [],
    meta: {
      examples: ["pragma modifier list", "pragma modifier list --llm"],
    },
    async execute() {
      const families = await listModifiers(ctx.store);

      if (families.length === 0) {
        throw PragmaError.emptyResults("modifier", {
          recovery:
            "Ensure design system packages are installed: bun add -D @canonical/ds-global",
        });
      }

      return createOutputResult(families, {
        plain: selectFormatter(ctx, listFormatters),
      });
    },
  };
}
