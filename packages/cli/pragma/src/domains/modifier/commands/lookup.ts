/**
 * Wires the `pragma modifier lookup <name...>` CLI command.
 *
 * Retrieves a single modifier family by name and renders its values.
 */

import {
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import { createLookupView } from "#tui";
import type { PragmaContext } from "../../shared/context.js";
import type { LookupResult } from "../../shared/contracts.js";
import { renderLookupResults } from "../../shared/formatters.js";
import {
  createInkLookupOptions,
  lookupFormatters,
} from "../formatters/index.js";
import type { lookupModifier } from "../operations/index.js";
import { resolveModifierLookup } from "../orchestration/index.js";

interface ModifierLookupOutput {
  readonly result: LookupResult<Awaited<ReturnType<typeof lookupModifier>>>;
}

export default function buildLookupCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["modifier", "lookup"],
    description: "Look up a modifier family and its values",
    parameters: [
      {
        name: "names",
        description: "Modifier family names or IRIs",
        type: "multiselect",
        positional: true,
        required: true,
      },
    ],
    meta: {
      examples: [
        "pragma modifier lookup importance",
        "pragma modifier lookup importance density",
        "pragma modifier lookup importance --llm",
      ],
    },
    async execute(params: Record<string, unknown>) {
      const names = normalizeNames(params.names, params.name);
      const contract = await resolveModifierLookup(ctx.store, names);

      return createOutputResult<ModifierLookupOutput>(
        { result: contract.result },
        {
          plain: ({ result }) =>
            renderLookupResults({
              ctx,
              result,
              formatters: lookupFormatters,
              mapResult: (family) => family,
            }),
          ink: ({ result }) =>
            createLookupView({
              results: result.results,
              errors: result.errors,
              domain: "modifier",
              options: createInkLookupOptions(),
            }),
        },
      );
    },
  };
}

function normalizeNames(names: unknown, legacyName?: unknown): string[] {
  if (Array.isArray(names)) {
    return names.filter(
      (name): name is string => typeof name === "string" && name.length > 0,
    );
  }
  if (typeof legacyName === "string" && legacyName.length > 0) {
    return [legacyName];
  }
  return [];
}
