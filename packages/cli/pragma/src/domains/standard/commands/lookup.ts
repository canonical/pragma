/**
 * Wires the `pragma standard lookup <name-or-uri...>` CLI command.
 *
 * Retrieves detailed information for a single code standard, including
 * optional dos/donts code blocks when `--detailed` is passed.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import type { PragmaContext } from "../../shared/context.js";
import type { LookupResult } from "../../shared/contracts.js";
import { lookupFormatters } from "../formatters/index.js";
import type { lookupStandard } from "../operations/index.js";
import { resolveStandardLookup } from "../orchestration/index.js";

interface StandardLookupOutput {
  readonly result: LookupResult<Awaited<ReturnType<typeof lookupStandard>>>;
  readonly detailed: boolean;
}

export default function buildLookupCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["standard", "lookup"],
    description: "Look up detailed information for a standard by name or IRI",
    parameters: [
      {
        name: "names",
        description: "Standard names or IRIs",
        type: "multiselect",
        positional: true,
        required: true,
      },
      {
        name: "detailed",
        description: "Include dos and donts with code blocks",
        type: "boolean",
        default: false,
      },
    ],
    meta: {
      examples: [
        "pragma standard lookup react/component/folder-structure",
        "pragma standard lookup react/component/folder-structure react/component/props",
        "pragma standard lookup react/component/folder-structure --detailed",
        "pragma standard lookup react/component/folder-structure --llm",
        "pragma standard lookup cs:react_props",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const names = normalizeNames(params.names, params.name);
      const detailed = (params.detailed as boolean) ?? false;
      const contract = await resolveStandardLookup(ctx.store, names);

      return createOutputResult<StandardLookupOutput>(
        { result: contract.result, detailed },
        { plain: renderStandardLookupOutput(ctx) },
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

function renderStandardLookupOutput(
  ctx: PragmaContext,
): (data: StandardLookupOutput) => string {
  return ({ result, detailed }) => {
    const formatOne =
      ctx.globalFlags.format === "json"
        ? lookupFormatters.json
        : ctx.globalFlags.llm
          ? lookupFormatters.llm
          : lookupFormatters.plain;

    if (ctx.globalFlags.format === "json") {
      if (result.results.length === 1 && result.errors.length === 0) {
        const only = result.results[0];
        return only
          ? lookupFormatters.json({ standard: only, detailed })
          : JSON.stringify({ results: [], errors: result.errors }, null, 2);
      }

      return JSON.stringify(
        {
          results: result.results.map((standard) =>
            JSON.parse(lookupFormatters.json({ standard, detailed })),
          ),
          errors: result.errors,
        },
        null,
        2,
      );
    }

    const parts = result.results.map((standard) =>
      formatOne({ standard, detailed }),
    );

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
