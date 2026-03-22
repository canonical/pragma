import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./createMcpServer.js";

/**
 * Start the MCP server over stdio transport.
 *
 * Boots the pragma runtime, connects to stdin/stdout, and runs until the
 * process receives SIGINT or stdin closes.
 *
 * @returns Resolves when the transport connection is established.
 *
 * @note Impure
 */
export default async function runMcpServer(): Promise<void> {
  const { server, dispose } = await createMcpServer();
  const transport = new StdioServerTransport();

  process.on("SIGINT", () => {
    dispose();
    process.exit(0);
  });

  await server.connect(transport);
}
