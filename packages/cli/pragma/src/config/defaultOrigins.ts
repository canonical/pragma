import type { ConfigOrigins } from "./types.js";

/**
 * The all-defaults provenance map — every field sourced from the built-in
 * layer.
 *
 * Used by store-less stub contexts (root help, store-skip commands) and
 * test runtimes that never read the layered config; a real boot threads
 * `readConfigLayers().origins` instead.
 */
export const DEFAULT_ORIGINS: ConfigOrigins = {
  tier: "default",
  channel: "default",
  packages: "default",
  trace: "default",
  framework: "default",
  stories: "default",
  prefixes: "default",
  detail: "default",
  prompts: "default",
};
