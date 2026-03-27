import type { PackageType } from "../types.js";

/**
 * Get license based on package type.
 */
export default function getLicense(type: PackageType): string {
  if (type === "tool-ts") return "GPL-3.0";
  return "LGPL-3.0";
}
