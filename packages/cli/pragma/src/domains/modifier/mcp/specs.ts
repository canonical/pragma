/**
 * MCP tool specs for the modifier domain.
 *
 * Declarative definitions — no MCP imports. The adapter layer
 * converts these into registered MCP tools via `registerFromSpec()`.
 */

import type { ToolSpec } from "../../shared/ToolSpec.js";
import {
  listFormatters as modifierListFmt,
  lookupFormatters as modifierLookupFmt,
  sampleFormatters as modifierSampleFmt,
} from "../formatters/index.js";
import { sampleModifiers } from "../operations/index.js";
import {
  resolveModifierList,
  resolveModifierLookup,
} from "../orchestration/index.js";

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
      const resolution = await resolveModifierList(rt);

      if (condensed) {
        const text = modifierListFmt.llm([...resolution.items]);
        return {
          condensed: true,
          text,
          tokens: `~${Math.ceil(text.length / 4)}`,
        };
      }

      return {
        data: resolution.items,
        meta: { count: resolution.items.length },
      };
    },
  },

  {
    name: "modifier_lookup",
    description: "Get one or more modifier families and their values.",
    params: {
      names: {
        type: "string[]",
        description: "Modifier family names or IRIs to look up",
        optional: false,
      },
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { names, condensed }) {
      const contract = await resolveModifierLookup(rt.store, names as string[]);
      const result = contract.result;

      if (condensed) {
        const textParts = result.results.map((family) =>
          modifierLookupFmt.llm(family),
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

        return {
          condensed: true,
          text: textParts.join("\n\n"),
          tokens: `~${Math.ceil(textParts.join("\n\n").length / 4)}`,
        };
      }

      return { data: result, meta: { count: result.results.length } };
    },
  },
  {
    name: "modifier_sample",
    description:
      "Return 1–5 randomly selected complete modifier family instances as exemplars. Use BEFORE writing queries to see actual data shapes, property names, and value formats. Each call returns different instances.",
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
      const result = await sampleModifiers(rt.store, n);
      const nextSteps = [
        `These are ${result.samples.length} of ${result.totalCount} total modifier families.`,
        "Use modifier_lookup to inspect specific modifier families by name.",
        "Use modifier_list to see all available modifier families.",
      ];

      if (condensed) {
        const text = modifierSampleFmt.llm({ ...result, nextSteps });
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
] as const;

export default specs;
