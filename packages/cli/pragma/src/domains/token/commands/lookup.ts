/**
 * Wires the `pragma token lookup <name...>` CLI command.
 *
 * Retrieves detailed information for a single design token, including
 * per-theme values when `--detailed` is passed.
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
  createLookupFormatters,
  createTokenInkLookupOptions,
} from "../formatters/index.js";
import type { lookupToken } from "../operations/index.js";
import { resolveTokenLookup } from "../orchestration/index.js";

interface TokenLookupOutput {
  readonly result: LookupResult<Awaited<ReturnType<typeof lookupToken>>>;
  readonly detailed: boolean;
}

export default function buildLookupCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["token", "lookup"],
    description: "Look up detailed information for a design token",
    parameters: [
      {
        name: "names",
        description: "Token names or IRIs",
        type: "multiselect",
        positional: true,
        required: true,
      },
      {
        name: "detailed",
        description: "Include values per theme",
        type: "boolean",
        default: false,
      },
    ],
    meta: {
      examples: [
        "pragma token lookup color.primary",
        "pragma token lookup color.primary spacing.sm",
        "pragma token lookup color.primary --detailed",
        "pragma token lookup color.primary --llm",
      ],
    },
    async execute(params: Record<string, unknown>) {
      const names = normalizeNames(params.names, params.name);
      const detailed = (params.detailed as boolean) ?? false;
      const contract = await resolveTokenLookup(ctx.store, names);

      return createOutputResult<TokenLookupOutput>(
        { result: contract.result, detailed },
        {
          plain: ({ result, detailed: isDetailed }) =>
            renderLookupResults({
              ctx,
              result,
              formatters: createLookupFormatters({ detailed: isDetailed }),
              mapResult: (token) => token,
            }),
          ink: ({ result, detailed: isDetailed }) =>
            createLookupView({
              results: result.results,
              errors: result.errors,
              domain: "token",
              options: createTokenInkLookupOptions({ detailed: isDetailed }),
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
