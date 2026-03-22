/**
 * MCP config tools — config_show, config_tier, config_channel.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readConfig, writeConfig } from "#config";
import {
  validateChannel,
  validateTier,
} from "../../domains/config/operations/index.js";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { estimateTokens, wrapTool } from "../utils/index.js";

/**
 * Register config_show, config_tier, and config_channel tools.
 */
export function registerConfigTools(
  server: McpServer,
  runtime: PragmaRuntime,
): void {
  server.registerTool(
    "config_show",
    {
      description:
        "Show current pragma configuration (tier and channel settings).",
      inputSchema: z.object({
        condensed: z.boolean().optional().describe("Token-optimized output"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { condensed }) => {
      const data = {
        tier: rt.config.tier ?? null,
        channel: rt.config.channel,
      };

      if (condensed) {
        const text = `Config: tier=${data.tier ?? "(none)"} channel=${data.channel}`;
        return { condensed: true, text, tokens: estimateTokens(text) };
      }

      return { data };
    }),
  );

  server.registerTool(
    "config_tier",
    {
      description:
        "Set or reset the active tier. Pass a tier path to set, or reset=true to clear.",
      inputSchema: z.object({
        path: z
          .string()
          .optional()
          .describe("Tier path (e.g. 'global', 'apps/lxd')"),
        reset: z.boolean().optional().describe("Reset tier to default"),
      }),
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { path, reset }) => {
      if (reset) {
        writeConfig(rt.cwd, { tier: undefined });
        return { data: { tier: null, action: "reset" } };
      }

      if (path) {
        await validateTier(rt.store, path as string);
        writeConfig(rt.cwd, { tier: path as string });
        return { data: { tier: path, action: "set" } };
      }

      const config = readConfig(rt.cwd);
      return { data: { tier: config.tier ?? null, action: "query" } };
    }),
  );

  server.registerTool(
    "config_channel",
    {
      description:
        "Set or reset the release channel. Pass a value to set, or reset=true to clear.",
      inputSchema: z.object({
        value: z
          .string()
          .optional()
          .describe("Channel (normal, experimental, prerelease)"),
        reset: z.boolean().optional().describe("Reset channel to normal"),
      }),
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    wrapTool(runtime, async (rt, { value, reset }) => {
      if (reset) {
        writeConfig(rt.cwd, { channel: undefined });
        return { data: { channel: "normal", action: "reset" } };
      }

      if (value) {
        const channel = validateChannel(value as string);
        writeConfig(rt.cwd, { channel });
        return { data: { channel, action: "set" } };
      }

      const config = readConfig(rt.cwd);
      return { data: { channel: config.channel, action: "query" } };
    }),
  );
}
