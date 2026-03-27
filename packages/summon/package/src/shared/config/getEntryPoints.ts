import type { PackageType } from "../types.js";

/**
 * Get package entry points based on type.
 */
export default function getEntryPoints(
  type: PackageType,
): {
  module: string;
  types: string | null;
  files: string[];
  needsBuild: boolean;
} {
  if (type === "tool-ts") {
    return {
      module: "src/index.ts",
      types: "src/index.ts",
      files: ["src"],
      needsBuild: false,
    };
  }
  if (type === "css") {
    return {
      module: "src/index.css",
      types: null,
      files: ["src"],
      needsBuild: false,
    };
  }
  // library
  return {
    module: "dist/esm/index.js",
    types: "dist/types/index.d.ts",
    files: ["dist"],
    needsBuild: true,
  };
}
