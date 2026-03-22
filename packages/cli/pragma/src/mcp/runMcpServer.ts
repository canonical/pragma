/**
 * MCP server stdio entry point.
 *
 * @note Impure — starts stdio transport, runs until process exit or stdin close.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./createMcpServer.js";

export default async function runMcpServer(): Promise<void> {
  const { server, dispose } = await createMcpServer();
  const transport = new StdioServerTransport();

  process.on("SIGINT", () => {
    dispose();
    process.exit(0);
  });

  await server.connect(transport);
}
