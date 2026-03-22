/**
 * MCP server adapter for pragma.
 *
 * Re-exports server construction, tool registration, and error types
 * used by the CLI entry point and integration tests.
 *
 * @module
 */

export {
  createMcpServer,
  createMcpServerFromRuntime,
} from "./createMcpServer.js";
export type { McpErrorPayload, McpRecovery } from "./error/types.js";
export { default as registerAllTools } from "./tools/index.js";
