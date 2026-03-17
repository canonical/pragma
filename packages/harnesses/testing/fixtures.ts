/**
 * Shared test fixtures for @canonical/harnesses.
 */

import type { HarnessDefinition, McpServerConfig } from "../src/index.js";

/**
 * A minimal harness definition for testing.
 */
export const testHarness: HarnessDefinition = {
  id: "test-harness",
  name: "Test Harness",
  detect: [{ type: "directory", path: ".test-harness" }],
  configPath: (root) => `${root}/.test-harness/mcp.json`,
  configFormat: "json",
  mcpKey: "mcpServers",
  skillsPath: (root) => `${root}/.test-harness/skills`,
};

/**
 * A sample MCP server config for testing.
 */
export const testMcpConfig: McpServerConfig = {
  command: "test-server",
  args: ["--port", "3000"],
};

/**
 * A sample existing config file content with one MCP server entry.
 */
export const existingConfigJson = JSON.stringify(
  {
    mcpServers: {
      existing: { command: "existing-server" },
    },
  },
  null,
  2,
);

/**
 * A sample existing config file content with multiple MCP server entries.
 */
export const multiServerConfigJson = JSON.stringify(
  {
    mcpServers: {
      figma: { command: "figma-mcp" },
      context7: { command: "context7-mcp" },
    },
    someOtherField: true,
  },
  null,
  2,
);
