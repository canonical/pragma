/**
 * Wires the `pragma modifier list` CLI command.
 *
 * Lists all modifier families with their allowed values. Throws a
 * structured recovery error when no families are found.
 */

import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import { createListView } from "#tui";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { listFormatters } from "../formatters/index.js";
import { modifierConfig } from "../modifierConfig.js";
import { resolveModifierList } from "../orchestration/index.js";

export default function listCommand(ctx: PragmaContext): CommandDefinition {
  return {
    path: ["modifier", "list"],
    description: "List all modifier families",
    parameters: [],
    meta: {
      examples: ["pragma modifier list", "pragma modifier list --llm"],
    },
    async execute() {
      const resolution = await resolveModifierList(ctx);

      return createOutputResult([...resolution.items], {
        plain: selectFormatter(ctx, listFormatters),
        ink: (data) =>
          createListView({
            heading: "Modifiers",
            domain: "modifier",
            items: data,
            columns: modifierConfig.listColumns,
          }),
      });
    },
  };
}
