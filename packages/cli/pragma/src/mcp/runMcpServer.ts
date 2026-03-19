/**
 * MCP server stdio entry point.
 *
 * @note Impure — starts stdio transport, runs until process exit or stdin close.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import createMcpServer from "./createMcpServer.js";

export default async function runMcpServer(): Promise<void> {
  const server = await createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
