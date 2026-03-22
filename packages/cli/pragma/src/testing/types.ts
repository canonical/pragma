/**
 * Testing type definitions.
 *
 * Shared types for the MCP test client and other test infrastructure.
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

/**
 * Return value from {@link createTestMcpClient}.
 *
 * The caller must invoke `cleanup` when done to close
 * both the client and server transports.
 */
export interface TestMcpClientResult {
  /** The connected MCP client instance. */
  client: Client;
  /** Closes the client and server transports. */
  cleanup: () => Promise<void>;
}
