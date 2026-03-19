/**
 * `pragma standard categories` command definition.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "../../../error/index.js";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { categoriesFormatters } from "../formatters/index.js";
import { listCategories } from "../operations/index.js";

export default function buildCategoriesCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["standard", "categories"],
    description: "List all standard categories with counts",
    parameters: [],
    meta: {
      examples: ["pragma standard categories"],
    },
    execute: async (
      _params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const categories = await listCategories(ctx.store);

      if (categories.length === 0) {
        throw PragmaError.emptyResults("categories", {
          recovery:
            "Ensure code standards packages are installed: bun add -D @canonical/code-standards",
        });
      }

      return createOutputResult(categories, {
        plain: selectFormatter(ctx, categoriesFormatters),
      });
    },
  };
}
