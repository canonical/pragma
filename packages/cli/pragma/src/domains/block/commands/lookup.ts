/**
 * Wires the `pragma block lookup <name-or-uri...>` CLI command.
 *
 * Accepts a positional block name or IRI and optional aspect flags (anatomy,
 * modifiers, tokens, implementations). Delegates to {@link lookupBlock} for
 * data retrieval and {@link lookupFormatters} for output rendering.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import type { PragmaContext } from "../../shared/context.js";
import type { LookupResult } from "../../shared/contracts.js";
import { lookupFormatters } from "../formatters/index.js";
import { resolveAspects } from "../helpers/index.js";
import { listBlocks, type lookupBlock } from "../operations/index.js";
import {
  buildBlockFilters,
  resolveBlockLookup,
} from "../orchestration/index.js";
import type { AspectFlags } from "../types.js";

interface BlockLookupOutput {
  readonly result: LookupResult<Awaited<ReturnType<typeof lookupBlock>>>;
  readonly detailed: boolean;
  readonly aspects: AspectFlags;
}

export default function buildLookupCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["block", "lookup"],
    description: "Look up block details",
    parameters: [
      {
        name: "names",
        description: "Block names or IRIs",
        type: "multiselect",
        positional: true,
        required: true,
        complete: async (partial: string) => {
          const all = await listBlocks(ctx.store, ctx.config);
          return all
            .map((c) => c.name)
            .filter((n) => n.toLowerCase().startsWith(partial.toLowerCase()));
        },
      },
      {
        name: "detailed",
        description:
          "Show full details including anatomy, modifiers, tokens, and implementations",
        type: "boolean",
        default: false,
      },
      {
        name: "anatomy",
        description: "Show anatomy tree",
        type: "boolean",
        default: false,
      },
      {
        name: "modifiers",
        description: "Show modifier values",
        type: "boolean",
        default: false,
      },
      {
        name: "tokens",
        description: "Show token references",
        type: "boolean",
        default: false,
      },
      {
        name: "implementations",
        description: "Show implementation paths",
        type: "boolean",
        default: false,
      },
    ],
    parameterGroups: {
      "Aspect filters": ["anatomy", "modifiers", "tokens", "implementations"],
    },
    meta: {
      examples: [
        "pragma block lookup Button",
        "pragma block lookup Button Card",
        "pragma block lookup Button --detailed",
        "pragma block lookup Button --anatomy --modifiers",
        "pragma block lookup Button --detailed --llm",
        "pragma block lookup ds:global.component.button",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const names = normalizeNames(params.names, params.name);
      if (names.length === 0) {
        throw PragmaError.invalidInput("names", "(empty)", {
          recovery: {
            message: "List available blocks.",
            cli: "pragma block list",
            mcp: { tool: "block_list" },
          },
        });
      }

      const detailed = params.detailed === true;
      const aspectInput: Partial<AspectFlags> = {
        anatomy: params.anatomy === true,
        modifiers: params.modifiers === true,
        tokens: params.tokens === true,
        implementations: params.implementations === true,
      };

      const isAspectSelected =
        aspectInput.anatomy ||
        aspectInput.modifiers ||
        aspectInput.tokens ||
        aspectInput.implementations;
      const showDetailed = detailed || (isAspectSelected ?? false);
      const aspects = resolveAspects(aspectInput);

      const contract = await resolveBlockLookup(
        ctx.store,
        names,
        buildBlockFilters(ctx),
      );

      return createOutputResult<BlockLookupOutput>(
        { result: contract.result, detailed: showDetailed, aspects },
        { plain: renderBlockLookupOutput(ctx) },
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

function renderBlockLookupOutput(
  ctx: PragmaContext,
): (data: BlockLookupOutput) => string {
  return ({ result, detailed, aspects }) => {
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
          ? lookupFormatters.json({ block: only, detailed, aspects })
          : JSON.stringify({ results: [], errors: result.errors }, null, 2);
      }

      return JSON.stringify(
        {
          results: result.results.map((block) =>
            JSON.parse(lookupFormatters.json({ block, detailed, aspects })),
          ),
          errors: result.errors,
        },
        null,
        2,
      );
    }

    const parts = result.results.map((block) =>
      formatOne({ block, detailed, aspects }),
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
