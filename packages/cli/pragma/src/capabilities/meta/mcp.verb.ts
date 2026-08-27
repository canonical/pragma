/**
 * `mcp serve` — the MCP server entry point.
 *
 * The server is not an agent tool, so it is withheld from MCP with a reason —
 * but it IS a command, and it is spelled like one: a noun and a verb, the same
 * shape as every other pair in the grammar, so it completes, appears in help,
 * and answers `--help` without a special case. The bin still short-circuits
 * the exact `pragma mcp serve` invocation before flag parsing and first-run,
 * because the server's stdout carries JSON-RPC and nothing else may reach it;
 * this spec's lazy `run` is that same serve, for any tier that dispatches it.
 */

import type { VerbSpec } from "../../kernel/spec/index.js";

/** The `mcp` verb spec. */
export const mcpVerb: VerbSpec<Record<string, unknown>, void> = {
  path: ["mcp", "serve"],
  summary: "Start the MCP server over stdio.",
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
