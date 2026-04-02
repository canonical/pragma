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
import { createLookupView } from "#tui";
import type { PragmaContext } from "../../shared/context.js";
import type { LookupResult } from "../../shared/contracts.js";
import { renderLookupResults } from "../../shared/formatters.js";
import {
  createInkLookupOptions,
  lookupFormatters,
} from "../formatters/index.js";
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
        {
          plain: ({ result, detailed: isDetailed }) =>
            renderLookupResults({
              ctx,
              result,
              formatters: lookupFormatters,
              mapResult: (standard) => ({ standard, detailed: isDetailed }),
            }),
          ink: ({ result, detailed: isDetailed }) =>
            createLookupView({
              results: result.results,
              errors: result.errors,
              domain: "standard",
              options: createInkLookupOptions(isDetailed),
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
