import type { OrientationConfig } from "./navigationTypes.js";

/**
 * Resolve an orientation config to a concrete value for a given depth.
 *
 * Accepts either a fixed orientation string or a function that computes
 * orientation per depth level.
 *
 * @param config - Fixed orientation or function of depth
 * @param depth - The tree depth to resolve for
 * @returns "horizontal" or "vertical"
 */
export default function resolveOrientation(
  config: OrientationConfig,
  depth: number,
): "horizontal" | "vertical" {
  return typeof config === "function" ? config(depth) : config;
}
