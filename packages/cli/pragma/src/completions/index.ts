/**
 * Completions server public API.
 *
 * Exports the server entry point, client entry point, socket path
 * computation, and query handler for use by runCli and the pragma
 * package barrel.
 */

export { default as computeSocketPath } from "./computeSocketPath.js";
export { default as handleQuery } from "./handleQuery.js";
export { default as queryCompletions } from "./queryCompletions.js";
export { default as startCompletionsServer } from "./startCompletionsServer.js";
