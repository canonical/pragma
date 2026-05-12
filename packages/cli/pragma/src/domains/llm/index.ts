/**
 * @module LLM domain barrel.
 *
 * Provides the `pragma capabilities` and `pragma llm` commands
 * for LLM orientation context generation.
 */

export { buildCapabilitiesCommand, buildLlmCommand } from "./commands/index.js";
export { specs as mcpSpecs } from "./mcp/index.js";
