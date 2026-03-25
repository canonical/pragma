/**
 * MCP tool specs for the token domain.
 *
 * Declarative definitions — no MCP imports. The adapter layer
 * converts these into registered MCP tools via `registerFromSpec()`.
 */

import { writeFileSync } from "node:fs";
import { PragmaError } from "#error";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import {
  createLookupFormatters as createTokenLookupFmt,
  listFormatters as tokenListFmt,
} from "../formatters/index.js";
import { resolveAddConfig } from "../operations/index.js";
import {
  resolveTokenList,
  resolveTokenLookup,
} from "../orchestration/index.js";

const specs: readonly ToolSpec[] = [
  {
    name: "token_list",
    description:
      "List all design tokens. Optionally filter by category (token type).",
    params: {
      category: {
        type: "string",
        description: "Filter by token type (e.g., Color, Dimension)",
        optional: true,
      },
      condensed: {
        type: "boolean",
        description: "Token-optimized output",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { category, condensed }) {
      const resolution = await resolveTokenList(rt, {
        category: category as string | undefined,
      });

      if (condensed) {
        const text = tokenListFmt.llm([...resolution.items]);
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
    name: "token_lookup",
    description:
      "Get detailed information about one or more design tokens including theme values.",
    params: {
      names: {
        type: "string[]",
        description: "Token names or IRIs to look up (e.g. ['color.primary'])",
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
      const contract = await resolveTokenLookup(rt.store, names as string[]);
      const result = contract.result;

      if (condensed) {
        const fmt = createTokenLookupFmt({ detailed: true });
        const textParts = result.results.map((token) => fmt.llm(token));

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
    name: "tokens_add_config",
    description:
      "Generate a tokens.config.mjs file for terrazzo token pipeline.",
    params: {
      force: {
        type: "boolean",
        description: "Overwrite existing config file",
        optional: true,
      },
    },
    readOnly: false,
    async execute(rt, { force }) {
      const result = resolveAddConfig(rt.cwd);

      if (result.alreadyExists && !force) {
        throw PragmaError.invalidInput("tokens.config.mjs", "already exists", {
          recovery: {
            message: "Overwrite existing config file.",
            cli: "pragma tokens add-config --force",
            mcp: { tool: "tokens_add_config", params: { force: true } },
          },
        });
      }

      writeFileSync(result.configPath, result.configContent, "utf-8");

      return {
        data: {
          configPath: result.configPath,
          tokenSources: result.tokenSources,
          installHint: result.installHint,
        },
      };
    },
  },
] as const;

export default specs;
