/**
 * Programmatic tsconfig.json builder
 *
 * Builds tsconfig.json and tsconfig.build.json as typed objects.
 * Non-JSON files (vite, vitest, storybook) live in templates/.
 */

import type { CompilerOptions } from "typescript";
import type { TemplateContext } from "../types.js";

const toJson = (object: unknown): string =>
  `${JSON.stringify(object, null, 2)}\n`;

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

const buildTsconfigReact = (context: TemplateContext): TsconfigJson => {
  const include = ["src/**/*.ts", "src/**/*.tsx"];
  if (context.storybook) {
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

export const buildTsconfigJson = (context: TemplateContext): string => {
  const tsconfig =
    context.framework === "react"
      ? buildTsconfigReact(context)
      : buildTsconfigNone();
  return toJson(tsconfig);
};

// =============================================================================
// tsconfig.build.json
// =============================================================================

const buildTsconfigBuildReact = (context: TemplateContext): TsconfigJson => {
  const exclude = [
    "src/**/*.stories.ts",
    "src/**/*.stories.tsx",
    "src/**/*.tests.ts",
    "src/**/*.tests.tsx",
    "vite.config.ts",
    "vitest.setup.ts",
    "vitest.config.ts",
  ];
  if (context.storybook) {
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
export const buildTsconfigBuildJson = (
  context: TemplateContext,
): string | null => {
  if (context.framework !== "react") return null;
  return toJson(buildTsconfigBuildReact(context));
};
