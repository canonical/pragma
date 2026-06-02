/**
 * MCP tool specs for the standard domain.
 *
 * Declarative definitions — no MCP imports. The adapter layer
 * converts these into registered MCP tools via `registerFromSpec()`.
 */

import type { ToolSpec } from "../../shared/ToolSpec.js";
import {
  type StandardListOutput,
  categoriesFormatters as standardCatFmt,
  listFormatters as standardListFmt,
  lookupFormatters as standardLookupFmt,
  sampleFormatters as standardSampleFmt,
} from "../formatters/index.js";
import { listCategories, sampleStandards } from "../operations/index.js";
import {
  resolveStandardList,
  resolveStandardLookup,
} from "../orchestration/index.js";

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
      const resolution = await resolveStandardList(rt, {
        category: category as string | undefined,
        search: search as string | undefined,
        digest: digest === true,
        detailed: detailed === true,
      });
      const output: StandardListOutput = {
        items: resolution.items,
        details: resolution.details,
        disclosure: resolution.disclosure,
      };

      if (condensed) {
        const text = standardListFmt.llm(output);
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      if (resolution.disclosure.level === "summary") {
        return {
          data: resolution.items,
          meta: { count: resolution.items.length },
        };
      }

      return {
        data: JSON.parse(standardListFmt.json(output)),
        meta: {
          count: resolution.items.length,
          disclosure: resolution.disclosure.level,
        },
      };
    },
  },

  {
    name: "standard_lookup",
    description:
      "Get detailed information about one or more code standards including dos and donts with code examples.",
    params: {
      names: {
        type: "string[]",
        description: "Standard names or IRIs to look up",
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
    async execute(rt, { names, detailed, condensed }) {
      const showDetailed = (detailed as boolean | undefined) ?? true;
      const contract = await resolveStandardLookup(rt.store, names as string[]);
      const result = contract.result;

      if (condensed) {
        const textParts = result.results.map((standard) =>
          standardLookupFmt.llm({
            standard,
            detailed: showDetailed,
          }),
        );

        if (result.errors.length > 0) {
          textParts.push(
            [
              "### Errors",
              ...result.errors.map(
                (error) => `- ${error.query}: ${error.message}`,
              ),
            ].join("\n"),
          );
        }

        const text = textParts.join("\n\n");
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      if (!showDetailed) {
        return {
          data: {
            results: result.results.map(
              ({ uri, name, category, description }) => ({
                uri,
                name,
                category,
                description,
              }),
            ),
            errors: result.errors,
          },
          meta: { count: result.results.length },
        };
      }

      return { data: result, meta: { count: result.results.length } };
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
    name: "standard_sample",
    description:
      "Return 1–5 randomly selected complete code standard instances as exemplars. Use BEFORE writing queries to see actual data shapes, property names, and value formats. Each call returns different instances.",
    params: {
      count: {
        type: "string",
        description: "Number of samples (1–5, default 2)",
        optional: true,
      },
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { count, condensed }) {
      const n = Number(count ?? 2);
      const result = await sampleStandards(rt.store, n);
      const nextSteps = [
        `These are ${result.samples.length} of ${result.totalCount} total standards.`,
        "Use standard_lookup to inspect specific standards by name.",
        "Use standard_list with category param to filter by category.",
      ];

      if (condensed) {
        const text = standardSampleFmt.llm({ ...result, nextSteps });
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      return {
        data: {
          samples: result.samples,
          totalCount: result.totalCount,
          nextSteps,
        },
        meta: { count: result.samples.length },
      };
    },
  },
];

export default specs;
