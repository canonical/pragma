/**
 * File manifest collector
 *
 * Collects all files/directories to generate as a data structure,
 * organized to mirror the decision tree:
 *
 *   _base         → always
 *   css           → content=css
 *   typescript    → content=typescript
 *     framework   → framework != none
 *       react/    → framework=react
 *         component-library/ → isComponentLibrary
 *     cli         → withCli
 *
 * JSON configs are built programmatically; everything else is an EJS template.
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildBiomeJsonString,
  buildPackageJsonString,
  buildTsconfigBuildJson,
  buildTsconfigJson,
} from "../shared/config/index.js";
import type {
  FileManifest,
  GeneratedFile,
  TemplateContext,
  TemplatedFile,
  VersionMap,
} from "../shared/types.js";

// =============================================================================
// Template paths
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "..", "templates");

const resolveTemplatePath = (...segments: string[]): string =>
  path.join(templatesDir, ...segments);

// =============================================================================
// Layer collectors
// =============================================================================

const collectBaseLayer = (
  resolvePackagePath: (...segments: string[]) => string,
  context: TemplateContext,
  versions: VersionMap,
): { dirs: string[]; files: GeneratedFile[]; templates: TemplatedFile[] } => {
  const dirs = [resolvePackagePath(), resolvePackagePath("src")];

  const files: GeneratedFile[] = [
    {
      path: resolvePackagePath("package.json"),
      content: buildPackageJsonString(context, versions),
    },
    {
      path: resolvePackagePath("biome.json"),
      content: buildBiomeJsonString(context),
    },
  ];

  const templates: TemplatedFile[] = [
    {
      templatePath: resolveTemplatePath("_base", "README.md.ejs"),
      destPath: resolvePackagePath("README.md"),
    },
  ];

  return { dirs, files, templates };
};

const collectCssLayer = (
  resolvePackagePath: (...segments: string[]) => string,
): TemplatedFile[] => [
  {
    templatePath: resolveTemplatePath("css", "index.css.ejs"),
    destPath: resolvePackagePath("src", "index.css"),
  },
];

const collectTypescriptLayer = (
  resolvePackagePath: (...segments: string[]) => string,
  context: TemplateContext,
): { files: GeneratedFile[]; templates: TemplatedFile[] } => {
  const files: GeneratedFile[] = [
    {
      path: resolvePackagePath("tsconfig.json"),
      content: buildTsconfigJson(context),
    },
  ];

  const tsconfigBuild = buildTsconfigBuildJson(context);
  if (tsconfigBuild) {
    files.push({
      path: resolvePackagePath("tsconfig.build.json"),
      content: tsconfigBuild,
    });
  }

  const templates: TemplatedFile[] = [
    {
      templatePath: resolveTemplatePath("typescript", "index.ts.ejs"),
      destPath: resolvePackagePath("src", "index.ts"),
    },
  ];

  return { files, templates };
};

const collectReactLayer = (
  resolvePackagePath: (...segments: string[]) => string,
): { dirs: string[]; templates: TemplatedFile[] } => {
  const dirs = [
    resolvePackagePath("src", "lib"),
    resolvePackagePath("src", "assets"),
  ];

  const templates: TemplatedFile[] = [
    {
      templatePath: resolveTemplatePath(
        "typescript",
        "framework",
        "react",
        "vite.config.ts.ejs",
      ),
      destPath: resolvePackagePath("vite.config.ts"),
    },
    {
      templatePath: resolveTemplatePath(
        "typescript",
        "framework",
        "react",
        "vitest.setup.ts.ejs",
      ),
      destPath: resolvePackagePath("vitest.setup.ts"),
    },
  ];

  return { dirs, templates };
};

const collectComponentLibraryLayer = (
  resolvePackagePath: (...segments: string[]) => string,
): { dirs: string[]; templates: TemplatedFile[] } => {
  const dirs = [resolvePackagePath(".storybook"), resolvePackagePath("public")];

  const templates: TemplatedFile[] = [
    {
      templatePath: resolveTemplatePath(
        "typescript",
        "framework",
        "react",
        "component-library",
        "storybook-main.ts.ejs",
      ),
      destPath: resolvePackagePath(".storybook", "main.ts"),
    },
    {
      templatePath: resolveTemplatePath(
        "typescript",
        "framework",
        "react",
        "component-library",
        "storybook-preview.ts.ejs",
      ),
      destPath: resolvePackagePath(".storybook", "preview.ts"),
    },
    {
      templatePath: resolveTemplatePath(
        "typescript",
        "framework",
        "react",
        "component-library",
        "storybook-styles.css.ejs",
      ),
      destPath: resolvePackagePath(".storybook", "styles.css"),
    },
  ];

  return { dirs, templates };
};

const collectCliLayer = (
  resolvePackagePath: (...segments: string[]) => string,
): TemplatedFile[] => [
  {
    templatePath: resolveTemplatePath("typescript", "cli", "cli.ts.ejs"),
    destPath: resolvePackagePath("src", "cli.ts"),
  },
];

// =============================================================================
// Manifest builder
// =============================================================================

export const collectManifest = (
  context: TemplateContext,
  packageDir: string,
  versions: VersionMap = {},
): FileManifest => {
  const resolvePackagePath = (...segments: string[]): string =>
    segments.length === 0 ? packageDir : path.join(packageDir, ...segments);

  const isCSS = context.content === "css";
  const isReact = context.framework === "react";

  // ─── _base layer (always) ─────────────────────────────────────────────
  const base = collectBaseLayer(resolvePackagePath, context, versions);
  const dirs = [...base.dirs];
  const files = [...base.files];
  const templates = [...base.templates];

  // ─── css layer ────────────────────────────────────────────────────────
  if (isCSS) {
    templates.push(...collectCssLayer(resolvePackagePath));
    return { dirs, files, templates };
  }

  // ─── typescript layer ─────────────────────────────────────────────────
  const tsLayer = collectTypescriptLayer(resolvePackagePath, context);
  files.push(...tsLayer.files);
  templates.push(...tsLayer.templates);

  // ─── typescript/framework/react layer ─────────────────────────────────
  if (isReact) {
    const reactLayer = collectReactLayer(resolvePackagePath);
    dirs.push(...reactLayer.dirs);
    templates.push(...reactLayer.templates);
  }

  // ─── component-library layer (storybook dirs + framework templates) ──
  if (context.storybook) {
    const componentLayer = collectComponentLibraryLayer(resolvePackagePath);
    dirs.push(...componentLayer.dirs);

    if (isReact) {
      templates.push(...componentLayer.templates);
    }
  }

  // ─── typescript/cli layer ─────────────────────────────────────────────
  if (context.withCli) {
    templates.push(...collectCliLayer(resolvePackagePath));
  }

  return { dirs, files, templates };
};
