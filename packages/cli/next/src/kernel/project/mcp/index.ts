/**
 * MCP projector barrel — the server builder and the verb→tool adapter.
 */

export { buildServer } from "./buildServer.js";
export { toolError, toolSuccess } from "./envelope.js";
export { buildZodSchema, registerVerb } from "./registerVerb.js";
export { serveMcp } from "./serve.js";
