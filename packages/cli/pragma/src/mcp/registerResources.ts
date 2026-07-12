/**
 * Entry point for the MCP resource surface.
 *
 * The implementation lives in `./resources/`, split across focused modules
 * (index build, listing, autocomplete, reads). This file re-exports the
 * registrar so existing importers keep a stable path.
 */

export { default } from "./resources/registerResources.js";
