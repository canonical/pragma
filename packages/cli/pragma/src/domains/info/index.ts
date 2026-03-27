/**
 * @module Info domain barrel.
 *
 * Provides the `pragma info` and `pragma upgrade` commands,
 * and the `info` MCP tool spec.
 */

export { infoCommand, upgradeCommand } from "./commands/index.js";
export { specs as infoSpecs } from "./mcp/index.js";
