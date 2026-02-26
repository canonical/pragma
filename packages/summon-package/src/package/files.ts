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
  buildTsconfigBuildJson,
  buildTsconfigJson,
} from "../shared/config-files.js";
import type { TemplateContext } from "../shared/index.js";
import {
  buildBiomeJsonString,
  buildPackageJsonString,
} from "../shared/package-json.js";
import type { VersionMap } from "../shared/versions.js";

// =============================================================================
// Types
// =============================================================================

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface TemplatedFile {
  templatePath: string;
  destPath: string;
}

export interface FileManifest {
  dirs: string[];
  files: GeneratedFile[];
  templates: TemplatedFile[];
}

// =============================================================================
// Template paths
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "..", "templates");

const tp = (...segments: string[]): string =>
  path.join(templatesDir, ...segments);

// =============================================================================
// Manifest builder
// =============================================================================

export const collectManifest = (
  ctx: TemplateContext,
  packageDir: string,
  versions: VersionMap = {},
): FileManifest => {
  const dirs: string[] = [];
  const files: GeneratedFile[] = [];
  const templates: TemplatedFile[] = [];

  const p = (...segments: string[]): string =>
    path.join(packageDir, ...segments);

  const isCSS = ctx.content === "css";
  const isReact = ctx.framework === "react";
  const hasFramework = ctx.framework !== "none";

  // ─── Directories ───────────────────────────────────────────────────────

  dirs.push(packageDir, p("src"));

  if (isReact) {
    dirs.push(p("src", "lib"), p("src", "assets"));
  }

  if (ctx.storybook) {
    dirs.push(p(".storybook"), p("public"));
  }

  // ─── _base layer (always) ─────────────────────────────────────────────

  files.push(
    {
      path: p("package.json"),
      content: buildPackageJsonString(ctx, versions),
    },
    {
      path: p("biome.json"),
      content: buildBiomeJsonString(ctx),
    },
  );

  templates.push({
    templatePath: tp("_base", "README.md.ejs"),
    destPath: p("README.md"),
  });

  // ─── css layer ────────────────────────────────────────────────────────

  if (isCSS) {
    templates.push({
      templatePath: tp("css", "index.css.ejs"),
      destPath: p("src", "index.css"),
    });
  }

  // ─── typescript layer ─────────────────────────────────────────────────

  if (!isCSS) {
    files.push({
      path: p("tsconfig.json"),
      content: buildTsconfigJson(ctx),
    });

    const tsconfigBuild = buildTsconfigBuildJson(ctx);
    if (tsconfigBuild) {
      files.push({
        path: p("tsconfig.build.json"),
        content: tsconfigBuild,
      });
    }

    templates.push({
      templatePath: tp("typescript", "index.ts.ejs"),
      destPath: p("src", "index.ts"),
    });
  }

  // ─── typescript/framework/{framework} layer ───────────────────────────

  if (!isCSS && hasFramework) {
    if (isReact) {
      templates.push(
        {
          templatePath: tp(
            "typescript",
            "framework",
            "react",
            "vite.config.ts.ejs",
          ),
          destPath: p("vite.config.ts"),
        },
        {
          templatePath: tp(
            "typescript",
            "framework",
            "react",
            "vitest.setup.ts.ejs",
          ),
          destPath: p("vitest.setup.ts"),
        },
      );
    }
  }

  // ─── typescript/framework/{framework}/component-library layer ──────────

  if (ctx.storybook) {
    if (isReact) {
      templates.push(
        {
          templatePath: tp(
            "typescript",
            "framework",
            "react",
            "component-library",
            "storybook-main.ts.ejs",
          ),
          destPath: p(".storybook", "main.ts"),
        },
        {
          templatePath: tp(
            "typescript",
            "framework",
            "react",
            "component-library",
            "storybook-preview.ts.ejs",
          ),
          destPath: p(".storybook", "preview.ts"),
        },
        {
          templatePath: tp(
            "typescript",
            "framework",
            "react",
            "component-library",
            "storybook-styles.css.ejs",
          ),
          destPath: p(".storybook", "styles.css"),
        },
      );
    }
  }

  // ─── typescript/cli layer ─────────────────────────────────────────────

  if (ctx.withCli) {
    templates.push({
      templatePath: tp("typescript", "cli", "cli.ts.ejs"),
      destPath: p("src", "cli.ts"),
    });
  }

  return { dirs, files, templates };
};
