/**
 * MCP token tools — token_list, token_lookup, token_batch_lookup, tokens_add_config.
 */

import { writeFileSync } from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PragmaError } from "#error";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import type { BatchResult, TokenDetailed } from "../../domains/shared/types.js";
import {
  createLookupFormatters as createTokenLookupFmt,
  listFormatters as tokenListFmt,
} from "../../domains/token/formatters/index.js";
import {
  listTokens,
  lookupToken,
  resolveAddConfig,
} from "../../domains/token/operations/index.js";
import { estimateTokens, wrapTool } from "../utils/index.js";

/**
 * Register token_list, token_lookup, and tokens_add_config tools.
 */
export function registerTokenTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerTool(
    "token_list",
    {
      description:
        "List all design tokens. Optionally filter by category (token type).",
      inputSchema: z.object({
        category: z
          .string()
          .optional()
          .describe("Filter by token type (e.g., Color, Dimension)"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { category, condensed }) => {
      const result = await listTokens(rt.store, {
        category: category as string | undefined,
      });

      if (condensed) {
        const text = tokenListFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result, meta: { count: result.length } };
    }),
  );

  server.registerTool(
    "token_lookup",
    {
      description:
        "Get detailed information about a design token including theme values.",
      inputSchema: z.object({
        name: z.string().describe("Token name (e.g. 'color.primary')"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { name, condensed }) => {
      const result = await lookupToken(rt.store, name as string);

      if (condensed) {
        const fmt = createTokenLookupFmt({ detailed: true });
        const text = fmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result };
    }),
  );

  server.registerTool(
    "token_batch_lookup",
    {
      description:
        "Look up multiple tokens by name in a single call. Returns results and errors for names that were not found.",
      inputSchema: z.object({
        names: z
          .array(z.string())
          .describe(
            "Token names to look up (e.g. ['color.primary', 'spacing.md'])",
          ),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { names }) => {
      const results: TokenDetailed[] = [];
      const errors: { name: string; code: string; message: string }[] = [];

      await Promise.all(
        (names as string[]).map(async (name) => {
          try {
            results.push(await lookupToken(rt.store, name));
          } catch (err) {
            if (err instanceof PragmaError) {
              errors.push({ name, code: err.code, message: err.message });
            } else {
              throw err;
            }
          }
        }),
      );

      const batch: BatchResult<TokenDetailed> = { results, errors };
      return { data: batch, meta: { count: results.length } };
    }),
  );

  server.registerTool(
    "tokens_add_config",
    {
      description:
        "Generate a tokens.config.mjs file for terrazzo token pipeline.",
      inputSchema: z.object({
        force: z
          .boolean()
          .optional()
          .describe("Overwrite existing config file"),
      }),
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { force }) => {
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
    }),
  );
}
