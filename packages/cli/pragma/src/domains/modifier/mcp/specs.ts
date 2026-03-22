/**
 * MCP tool specs for the modifier domain.
 *
 * Declarative definitions — no MCP imports. The adapter layer
 * converts these into registered MCP tools via `registerFromSpec()`.
 */

import { PragmaError } from "#error";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import type { BatchResult, ModifierFamily } from "../../shared/types.js";
import {
  listFormatters as modifierListFmt,
  lookupFormatters as modifierLookupFmt,
} from "../formatters/index.js";
import { listModifiers, lookupModifier } from "../operations/index.js";

const specs: readonly ToolSpec[] = [
  {
    name: "modifier_list",
    description: "List all modifier families with their values.",
    params: {
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { condensed }) {
      const result = await listModifiers(rt.store);

      if (condensed) {
        const text = modifierListFmt.llm(result);
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      return { data: result, meta: { count: result.length } };
    },
  },

  {
    name: "modifier_lookup",
    description: "Get a modifier family and its values.",
    params: {
      name: {
        type: "string",
        description: "Modifier family name (e.g. 'importance')",
        optional: false,
      },
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { name, condensed }) {
      const result = await lookupModifier(rt.store, name as string);

      if (condensed) {
        const text = modifierLookupFmt.llm(result);
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      return { data: result };
    },
  },

  {
    name: "modifier_batch_lookup",
    description:
      "Look up multiple modifier families by name in a single call. Returns results and errors for names that were not found.",
    params: {
      names: {
        type: "string[]",
        description: "Modifier family names to look up",
        optional: false,
      },
    },
    readOnly: true,
    async execute(rt, { names }) {
      const results: ModifierFamily[] = [];
      const errors: { name: string; code: string; message: string; recovery?: { tool: string } }[] = [];

      await Promise.all(
        (names as string[]).map(async (name) => {
          try {
            results.push(await lookupModifier(rt.store, name));
          } catch (err) {
            if (err instanceof PragmaError) {
              errors.push({ name, code: err.code, message: err.message, recovery: { tool: "modifier_list" } });
            } else {
              throw err;
            }
          }
        }),
      );

      const batch: BatchResult<ModifierFamily> = { results, errors };
      return { data: batch, meta: { count: results.length } };
    },
  },
] as const;

export default specs;
