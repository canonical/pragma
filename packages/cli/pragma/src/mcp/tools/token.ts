/**
 * MCP token tools — token_list, token_get, tokens_add_config.
 */

import { writeFileSync } from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PragmaError } from "#error";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import {
  createGetFormatters as createTokenGetFmt,
  listFormatters as tokenListFmt,
} from "../../domains/token/formatters/index.js";
import {
  getToken,
  listTokens,
  resolveAddConfig,
} from "../../domains/token/operations/index.js";
import { estimateTokens, wrapTool } from "../utils/index.js";

/**
 * Register token_list, token_get, and tokens_add_config tools.
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
        names: z
          .array(z.string())
          .optional()
          .describe("Filter to specific token names"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { category, names, condensed }) => {
      let result = await listTokens(rt.store, {
        category: category as string | undefined,
      });

      if (names && Array.isArray(names) && names.length > 0) {
        const nameSet = new Set(names as string[]);
        result = result.filter((t) => nameSet.has(t.name));
      }

      if (condensed) {
        const text = tokenListFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result, meta: { count: result.length } };
    }),
  );

  server.registerTool(
    "token_get",
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
      const result = await getToken(rt.store, name as string);

      if (condensed) {
        const fmt = createTokenGetFmt({ detailed: true });
        const text = fmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result };
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
