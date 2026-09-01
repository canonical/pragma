import type { Framework, PackageType } from "../types.js";

/**
 * Get package entry points based on type and framework.
 *
 * A Svelte library is the one variant whose layout is not ours to choose:
 * `svelte-package` writes a flat `dist/` holding the compiled components and
 * their declarations side by side, so `dist/index.js` / `dist/index.d.ts`
 * replace the `dist/esm` + `dist/types` split a `tsc` build produces. The
 * `package-svelte` webarchitect ruleset pins exactly that.
 */
export default function getEntryPoints(
  type: PackageType,
  framework: Framework = "none",
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
  if (framework === "svelte") {
    return {
      module: "dist/index.js",
      types: "dist/index.d.ts",
      files: ["dist"],
      needsBuild: true,
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
