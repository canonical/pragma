import type { Framework, Status, Tier } from "./types.js";

/**
 * Human-readable labels for tier values.
 */
export const TIER_LABELS: Record<Tier, string> = {
  global: "Global",
  global_form: "Global Form",
  apps: "Apps",
  apps_wpe: "Apps WPE",
};

/**
 * Descriptions for each tier level.
 */
export const TIER_DESCRIPTIONS: Record<Tier, string> = {
  global: "Universal components for all products",
  global_form: "Form-specific components and patterns",
  apps: "Application-level components",
  apps_wpe: "WordPress Engine specific components",
};

/**
 * Human-readable labels for framework values.
 */
export const FRAMEWORK_LABELS: Record<Framework, string> = {
  react: "React",
  svelte: "Svelte",
  "web-components": "Web Components",
};

/**
 * Human-readable labels for status values.
 */
export const STATUS_LABELS: Record<Status, string> = {
  stable: "Stable",
  prerelease: "Prerelease",
  deprecated: "Deprecated",
};
