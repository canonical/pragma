/**
 * MCP error serialization pipeline.
 *
 * Re-exports functions that transform PragmaError instances into
 * MCP-compatible error payloads and tool responses.
 *
 * @module
 */

export { default as buildRecovery } from "./buildRecovery.js";
export { default as serializeError } from "./serializeError.js";
export { default as serializeErrorPayload } from "./serializeErrorPayload.js";
