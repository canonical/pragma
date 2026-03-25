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
import type { PragmaContext } from "../../shared/context.js";
import type { LookupResult } from "../../shared/contracts.js";
import { createLookupFormatters } from "../formatters/index.js";
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
        { plain: renderTokenLookupOutput(ctx) },
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

function renderTokenLookupOutput(
  ctx: PragmaContext,
): (data: TokenLookupOutput) => string {
  return ({ result, detailed }) => {
    const formatters = createLookupFormatters({ detailed });
    const formatOne =
      ctx.globalFlags.format === "json"
        ? formatters.json
        : ctx.globalFlags.llm
          ? formatters.llm
          : formatters.plain;

    if (ctx.globalFlags.format === "json") {
      if (result.results.length === 1 && result.errors.length === 0) {
        const only = result.results[0];
        return only
          ? formatters.json(only)
          : JSON.stringify({ results: [], errors: result.errors }, null, 2);
      }

      return JSON.stringify(
        {
          results: result.results.map((token) =>
            JSON.parse(formatters.json(token)),
          ),
          errors: result.errors,
        },
        null,
        2,
      );
    }

    const parts = result.results.map((token) => formatOne(token));
    if (result.errors.length > 0) {
      parts.push(
        [
          "Errors:",
          ...result.errors.map((error) => `- ${error.query}: ${error.message}`),
        ].join("\n"),
      );
    }

    return parts.join("\n\n");
  };
}
