import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

export interface TestMcpClientResult {
  client: Client;
  cleanup: () => Promise<void>;
}
