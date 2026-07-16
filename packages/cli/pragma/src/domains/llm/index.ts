/**
 * @module LLM domain barrel.
 *
 * Provides the `pragma llm` command for LLM orientation context
 * generation. (The redesigned `capabilities` lives in its own domain.)
 */

export { buildLlmCommand } from "./commands/index.js";
export { specs as mcpSpecs } from "./mcp/index.js";
