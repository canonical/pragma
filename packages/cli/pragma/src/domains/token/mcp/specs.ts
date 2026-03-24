/**
 * MCP tool specs for the token domain.
 *
 * Declarative definitions — no MCP imports. The adapter layer
 * converts these into registered MCP tools via `registerFromSpec()`.
 */

import { writeFileSync } from "node:fs";
import { PragmaError } from "#error";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import type { BatchResult, TokenDetailed } from "../../shared/types.js";
import {
  createLookupFormatters as createTokenLookupFmt,
  listFormatters as tokenListFmt,
} from "../formatters/index.js";
import {
  listTokens,
  lookupToken,
  resolveAddConfig,
} from "../operations/index.js";

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
      const result = await listTokens(rt.store, {
        category: category as string | undefined,
      });

      if (condensed) {
        const text = tokenListFmt.llm(result);
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
    name: "token_lookup",
    description:
      "Get detailed information about a design token including theme values.",
    params: {
      name: {
        type: "string",
        description: "Token name (e.g. 'color.primary')",
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
      const result = await lookupToken(rt.store, name as string);

      if (condensed) {
        const fmt = createTokenLookupFmt({ detailed: true });
        const text = fmt.llm(result);
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
    name: "token_batch_lookup",
    description:
      "Look up multiple tokens by name in a single call. Returns results and errors for names that were not found.",
    params: {
      names: {
        type: "string[]",
        description:
          "Token names to look up (e.g. ['color.primary', 'spacing.md'])",
        optional: false,
      },
    },
    readOnly: true,
    async execute(rt, { names }) {
      const results: TokenDetailed[] = [];
      const errors: { name: string; code: string; message: string; recovery?: { tool: string } }[] = [];

      await Promise.all(
        (names as string[]).map(async (name) => {
          try {
            results.push(await lookupToken(rt.store, name));
          } catch (err) {
            if (err instanceof PragmaError) {
              errors.push({ name, code: err.code, message: err.message, recovery: { tool: "token_list" } });
            } else {
              throw err;
            }
          }
        }),
      );

      const batch: BatchResult<TokenDetailed> = { results, errors };
      return { data: batch, meta: { count: results.length } };
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
