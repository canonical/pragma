import type { PackageFramework, PackageType } from "../types.js";

/**
 * Get the webarchitect ruleset based on package type and framework.
 */
export default function getRuleset(
  type: PackageType,
  framework: PackageFramework,
): string {
  if (framework === "react") return "package-react";
  if (framework === "svelte") return "package-svelte";
  if (type === "css") return "base";
  return type;
}
