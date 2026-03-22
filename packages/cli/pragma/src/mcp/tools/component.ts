/**
 * MCP component tools — component_list, component_get.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getFormatters as componentGetFmt,
  listFormatters as componentListFmt,
} from "../../domains/component/formatters/index.js";
import {
  getComponent,
  listComponents,
} from "../../domains/component/operations/index.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { estimateTokens, wrapTool } from "../utils/index.js";
import { buildFilters, describeFilters } from "./helpers.js";

/**
 * Register component_list and component_get tools.
 */
export function registerComponentTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerTool(
    "component_list",
    {
      description:
        "List design system components visible under current tier and channel configuration.",
      inputSchema: z.object({
        allTiers: z
          .boolean()
          .optional()
          .describe("Show components from all tiers, ignoring tier filter"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { allTiers, condensed }) => {
      const filters = buildFilters(rt, allTiers as boolean | undefined);
      const result = await listComponents(rt.store, filters);

      if (condensed) {
        const text = componentListFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return {
        data: result,
        meta: { count: result.length, filters: describeFilters(filters) },
      };
    }),
  );

  server.registerTool(
    "component_get",
    {
      description:
        "Get detailed information about a design system component including anatomy, modifiers, tokens, and applicable standards.",
      inputSchema: z.object({
        name: z.string().describe("Component name (e.g. 'Button')"),
        detailed: z
          .boolean()
          .optional()
          .describe("Return full details (default: true for MCP)"),
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { name, detailed, condensed }) => {
      const filters = buildFilters(rt);
      const result = await getComponent(rt.store, name as string, filters);
      const showDetailed = (detailed as boolean | undefined) ?? true;

      if (condensed) {
        const text = componentGetFmt.llm({
          component: result,
          detailed: showDetailed,
          aspects: {
            anatomy: true,
            modifiers: true,
            tokens: true,
            implementations: true,
          },
        });
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      if (!showDetailed) {
        const {
          uri,
          name: n,
          tier,
          modifiers,
          implementations,
          nodeCount,
          tokenCount,
        } = result;
        return {
          data: {
            uri,
            name: n,
            tier,
            modifiers,
            implementations,
            nodeCount,
            tokenCount,
          },
        };
      }

      return { data: result };
    }),
  );
}
