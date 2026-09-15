import type { Framework, PackageType } from "../types.js";

/**
 * Get the webarchitect ruleset based on package type and framework.
 *
 * Expects a framework already reconciled by `resolveFramework` — a framework
 * only ever reaches here on a `library`.
 */
export default function getRuleset(
  type: PackageType,
  framework: Framework,
): string {
  if (framework === "react") return "package-react";
  if (framework === "svelte") return "package-svelte";
  if (type === "css") return "base";
  return type;
}
