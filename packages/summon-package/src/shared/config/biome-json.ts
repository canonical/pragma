/**
 * Programmatic biome.json builder
 *
 * Builds biome.json configuration as a typed object.
 */

import type { TemplateContext } from "../types.js";

// =============================================================================
// Types
// =============================================================================

interface BiomeJson {
  extends: string[];
  files: { includes: string[] };
}

// =============================================================================
// Builder
// =============================================================================

const buildBiomeJson = (context: TemplateContext): BiomeJson => {
  const includes = ["src", "*.json"];

  if (context.framework !== "none" && context.content !== "css") {
    includes.splice(1, 0, "vite.config.ts");
  }

  return {
    extends: ["@canonical/biome-config"],
    files: { includes },
  };
};

/**
 * Build a formatted biome.json string.
 */
export const buildBiomeJsonString = (context: TemplateContext): string => {
  return `${JSON.stringify(buildBiomeJson(context), null, 2)}\n`;
};
