/**
 * @module Capabilities domain barrel.
 *
 * `pragma capabilities` — the CLI mirror of the MCP orientation surfaces
 * (state resource, prompts list, tool reference) — and the `capabilities`
 * MCP aggregator tool for tools-only harnesses.
 */

export { buildCapabilitiesCommand } from "./commands/index.js";
export { specs as mcpSpecs } from "./mcp/index.js";
export {
  CAPABILITY_LEVELS,
  type CapabilitiesAggregate,
  type CapabilityLevel,
  type ReferencePayload,
} from "./types.js";
