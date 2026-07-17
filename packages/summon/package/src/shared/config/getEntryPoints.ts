import type { PackageFramework, PackageType } from "../types.js";

/**
 * Get package entry points based on type and framework.
 */
export default function getEntryPoints(
  type: PackageType,
  framework: PackageFramework,
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
  // library built with svelte-package (dist/ root, test/story files pruned)
  if (framework === "svelte") {
    return {
      module: "dist/index.js",
      types: "dist/index.d.ts",
      files: ["dist", "!dist/**/*.test.*", "!dist/**/*.stories.*"],
      needsBuild: true,
    };
  }
  // library built with tsc (plain or react)
  return {
    module: "dist/esm/index.js",
    types: "dist/types/index.d.ts",
    files: ["dist"],
    needsBuild: true,
  };
}
