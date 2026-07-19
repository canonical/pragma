/**
 * The hidden `mcp` verb — the MCP server entry point.
 *
 * The server is not an agent tool, so it is withheld from MCP with a reason and
 * `hidden` from the CLI surface/help. The bin special-cases `pragma mcp` to
 * serve over stdio (D9); this spec's lazy `run` is the same serve, reachable if
 * a future tier dispatches it.
 */

import type { VerbSpec } from "../../kernel/spec/types.js";

/** The `mcp` verb spec. */
export const mcpVerb: VerbSpec<Record<string, unknown>, void> = {
  path: ["mcp"],
  summary: "Start the MCP server over stdio.",
  hidden: true,
  params: [],
  output: {
    formatters: {
      plain: () => "",
      llm: () => "",
      json: () => JSON.stringify(null),
    },
  },
  capability: {
    needsStore: false,
    mutates: false,
    mcp: { expose: false, reason: "server entry, not an agent tool" },
  },
  run: () =>
    Promise.all([
      import("../../kernel/project/mcp/serve.js"),
      import("../index.js"),
    ]).then(([mcp, caps]) => mcp.serveMcp(caps.capabilities)),
};
