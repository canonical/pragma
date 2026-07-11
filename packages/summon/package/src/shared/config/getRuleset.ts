import type { PackageType } from "../types.js";

/**
 * Get the webarchitect ruleset based on package type and options.
 */
export default function getRuleset(
  type: PackageType,
  withReact: boolean,
): string {
  if (withReact) return "package-react-components";
  if (type === "css") return "base";
  return type;
}
