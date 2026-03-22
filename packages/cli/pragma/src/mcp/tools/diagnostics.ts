/**
 * MCP diagnostic tools — doctor, info.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { VERSION } from "../../constants.js";
import { doctorFormatters as doctorFmt } from "../../domains/doctor/formatters/index.js";
import { runChecks } from "../../domains/doctor/operations/index.js";
import { renderInfoLlm } from "../../domains/info/formatters/index.js";
import { collectStoreSummary } from "../../domains/info/operations/index.js";
import type { InfoData } from "../../domains/info/types.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import estimateTokens from "../estimateTokens.js";
import wrapTool from "../wrapTool.js";

/**
 * Register doctor and info tools.
 */
export function registerDiagnosticTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerTool(
    "doctor",
    {
      description:
        "Run health checks on the pragma environment. Validates config, store, completions, skills, and more.",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const result = await runChecks({ cwd: rt.cwd });

      if (condensed) {
        const text = doctorFmt.llm(result);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data: result };
    }),
  );

  server.registerTool(
    "info",
    {
      description: "Show pragma version, configuration, and store summary.",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const storeSummary = await collectStoreSummary(rt.store);

      const data: InfoData = {
        version: VERSION,
        pm: "unknown",
        configPath: "pragma.config.json",
        tier: rt.config.tier,
        tierChain: [],
        channel: rt.config.channel,
        channelReleases: [],
        update: undefined,
        updateSkipped: true,
        store: storeSummary,
      };

      if (condensed) {
        const text = renderInfoLlm(data);
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data };
    }),
  );
}
