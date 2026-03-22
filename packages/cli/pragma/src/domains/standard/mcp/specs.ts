/**
 * MCP tool specs for the standard domain.
 *
 * Declarative definitions — no MCP imports. The adapter layer
 * converts these into registered MCP tools via `registerFromSpec()`.
 */

import { PragmaError } from "#error";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import type {
  BatchResult,
  Disclosure,
  StandardDetailed,
} from "../../shared/types.js";
import {
  type StandardListOutput,
  categoriesFormatters as standardCatFmt,
  listFormatters as standardListFmt,
  lookupFormatters as standardLookupFmt,
} from "../formatters/index.js";
import {
  listCategories,
  listStandards,
  lookupStandard,
} from "../operations/index.js";

const specs: readonly ToolSpec[] = [
  {
    name: "standard_list",
    description:
      "List code standards. Optionally filter by category or search term. Use digest/detailed for progressive disclosure.",
    params: {
      category: {
        type: "string",
        description: "Filter by category name",
        optional: true,
      },
      search: {
        type: "string",
        description: "Search in name and description",
        optional: true,
      },
      digest: {
        type: "boolean",
        description: "Show description and first example for each standard",
        optional: true,
      },
      detailed: {
        type: "boolean",
        description: "Show full dos/donts for each standard",
        optional: true,
      },
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { category, search, digest, detailed, condensed }) {
      let result = await listStandards(rt.store);

      if (category) {
        const cat = (category as string).toLowerCase();
        result = result.filter((s) => s.category.toLowerCase() === cat);
      }

      if (search) {
        const term = (search as string).toLowerCase();
        result = result.filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            s.description.toLowerCase().includes(term),
        );
      }

      const disclosure: Disclosure = detailed
        ? { level: "detailed" }
        : digest
          ? { level: "digest" }
          : { level: "summary" };

      let details: (StandardDetailed | null)[] | undefined;

      if (disclosure.level !== "summary") {
        details = await Promise.all(
          result.map((s) => lookupStandard(rt.store, s.name).catch(() => null)),
        );
      }

      const output: StandardListOutput = {
        items: result,
        details,
        disclosure,
      };

      if (condensed) {
        const text = standardListFmt.llm(output);
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      if (disclosure.level === "summary") {
        return { data: result, meta: { count: result.length } };
      }

      // Return enriched data for digest/detailed
      return {
        data: JSON.parse(standardListFmt.json(output)),
        meta: { count: result.length, disclosure: disclosure.level },
      };
    },
  },

  {
    name: "standard_lookup",
    description:
      "Get detailed information about a code standard including dos and donts with code examples.",
    params: {
      name: {
        type: "string",
        description: "Standard name (e.g. 'code/function/purity')",
        optional: false,
      },
      detailed: {
        type: "boolean",
        description:
          "Return full details with dos/donts (default: true for MCP)",
        optional: true,
      },
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { name, detailed, condensed }) {
      const result = await lookupStandard(rt.store, name as string);
      const showDetailed = (detailed as boolean | undefined) ?? true;

      if (condensed) {
        const text = standardLookupFmt.llm({
          standard: result,
          detailed: showDetailed,
        });
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      if (!showDetailed) {
        const { uri, name: n, category, description } = result;
        return { data: { uri, name: n, category, description } };
      }

      return { data: result };
    },
  },

  {
    name: "standard_categories",
    description: "List all code standard categories.",
    params: {
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { condensed }) {
      const result = await listCategories(rt.store);

      if (condensed) {
        const text = standardCatFmt.llm(result);
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
    name: "standard_batch_lookup",
    description:
      "Look up multiple standards by name in a single call. Returns results and errors for names that were not found.",
    params: {
      names: {
        type: "string[]",
        description: "Standard names to look up",
        optional: false,
      },
    },
    readOnly: true,
    async execute(rt, { names }) {
      const results: StandardDetailed[] = [];
      const errors: { name: string; code: string; message: string; recovery?: { tool: string } }[] = [];

      await Promise.all(
        (names as string[]).map(async (name) => {
          try {
            results.push(await lookupStandard(rt.store, name));
          } catch (err) {
            if (err instanceof PragmaError) {
              errors.push({ name, code: err.code, message: err.message, recovery: { tool: "standard_list" } });
            } else {
              throw err;
            }
          }
        }),
      );

      const batch: BatchResult<StandardDetailed> = { results, errors };
      return { data: batch, meta: { count: results.length } };
    },
  },
] as const;

export default specs;
