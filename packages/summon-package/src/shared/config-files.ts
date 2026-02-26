/**
 * Programmatic JSON config file builders
 *
 * Builds JSON config files (tsconfig) as typed objects.
 * Non-JSON files (vite, vitest, storybook) live in templates/.
 */

import type { CompilerOptions } from "typescript";
import type { TemplateContext } from "./index.js";

const toJson = (obj: unknown): string => `${JSON.stringify(obj, null, 2)}\n`;
// =============================================================================
// Types
// =============================================================================

interface TsconfigJson {
  extends: string;
  compilerOptions: CompilerOptions;
  include: string[];
  exclude?: string[];
}

// =============================================================================
// tsconfig.json
// =============================================================================

const buildTsconfigNone = (): TsconfigJson => ({
  extends: "@canonical/typescript-config",
  compilerOptions: {
    baseUrl: "src",
    types: ["bun-types"],
  },
  include: ["src/**/*.ts"],
});

const buildTsconfigReact = (ctx: TemplateContext): TsconfigJson => {
  const include = ["src/**/*.ts", "src/**/*.tsx"];
  if (ctx.storybook) {
    include.push(".storybook/*.ts", ".storybook/*.tsx");
  }
  include.push("vite.config.ts");

  return {
    extends: "@canonical/typescript-config-react",
    compilerOptions: {
      baseUrl: "src",
      skipLibCheck: true,
      types: [
        "react",
        "react-dom",
        "vitest/globals",
        "@testing-library/jest-dom",
      ],
    },
    include,
  };
};

export const buildTsconfigJson = (ctx: TemplateContext): string => {
  const tsconfig =
    ctx.framework === "react" ? buildTsconfigReact(ctx) : buildTsconfigNone();
  return toJson(tsconfig);
};

// =============================================================================
// tsconfig.build.json
// =============================================================================

const buildTsconfigBuildReact = (ctx: TemplateContext): TsconfigJson => {
  const exclude = [
    "src/**/*.stories.ts",
    "src/**/*.stories.tsx",
    "src/**/*.tests.ts",
    "src/**/*.tests.tsx",
    "vite.config.ts",
    "vitest.setup.ts",
    "vitest.config.ts",
  ];
  if (ctx.storybook) {
    exclude.push(".storybook");
  }

  return {
    extends: "./tsconfig.json",
    compilerOptions: {
      rootDir: "src",
      outDir: "dist/esm",
      declaration: true,
      declarationDir: "dist/types",
      declarationMap: true,
      sourceMap: true,
    },
    include: ["src/**/*.ts", "src/**/*.tsx"],
    exclude,
  };
};

/**
 * Returns tsconfig.build.json content, or null if not needed.
 * Only React packages (which use vite build) need a separate build tsconfig.
 */
export const buildTsconfigBuildJson = (ctx: TemplateContext): string | null => {
  if (ctx.framework !== "react") return null;
  return toJson(buildTsconfigBuildReact(ctx));
};
