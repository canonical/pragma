/**
 * Package Generator
 *
 * Generates a new npm package with proper configuration for the pragma monorepo.
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  exec,
  flatMap,
  type GeneratorDefinition,
  info,
  mkdir,
  type PromptDefinition,
  sequence_,
  template,
  when,
} from "@canonical/summon";

import {
  createTemplateContext,
  detectMonorepo,
  detectPackageManager,
  getPackageShortName,
  type PackageAnswers,
  validatePackageName,
} from "../shared/index.js";

// =============================================================================
// Template Paths
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "..", "templates");

const templates = {
  packageJson: path.join(templatesDir, "package.json.ejs"),
  biome: path.join(templatesDir, "biome.json.ejs"),
  readme: path.join(templatesDir, "README.md.ejs"),
  tsconfig: path.join(templatesDir, "tsconfig.json.ejs"),
  tsconfigReact: path.join(templatesDir, "tsconfig-react.json.ejs"),
  tsconfigBuildReact: path.join(templatesDir, "tsconfig-build-react.json.ejs"),
  viteConfigReact: path.join(templatesDir, "vite.config-react.ts.ejs"),
  vitestConfigReact: path.join(templatesDir, "vitest.config-react.ts.ejs"),
  vitestSetupReact: path.join(templatesDir, "vitest.setup-react.ts.ejs"),
  indexTs: path.join(templatesDir, "index.ts.ejs"),
  indexCss: path.join(templatesDir, "index.css.ejs"),
  cliTs: path.join(templatesDir, "cli.ts.ejs"),
  storybookMainReact: path.join(templatesDir, "storybook-main-react.ts.ejs"),
  storybookPreviewReact: path.join(
    templatesDir,
    "storybook-preview-react.ts.ejs",
  ),
  storybookStylesReact: path.join(
    templatesDir,
    "storybook-styles-react.css.ejs",
  ),
};

// =============================================================================
// Prompts
// =============================================================================

const prompts: PromptDefinition[] = [
  {
    name: "name",
    type: "text",
    message: "Package name:",
    default: "@canonical/my-package",
    validate: validatePackageName,
    group: "Package",
  },
  {
    name: "type",
    type: "select",
    message: "Package type:",
    choices: [
      {
        label: "tool-ts - TypeScript tool (runs from src/, no build)",
        value: "tool-ts",
      },
      {
        label: "library - TypeScript library (dist/ build output)",
        value: "library",
      },
      {
        label: "react-library - React component library (dist/ build)",
        value: "react-library",
      },
      {
        label: "css - CSS package (src/index.css, no build)",
        value: "css",
      },
    ],
    default: "tool-ts",
    group: "Package",
  },
  {
    name: "description",
    type: "text",
    message: "Package description:",
    default: "",
    group: "Package",
  },
  {
    name: "withStorybook",
    type: "confirm",
    message: "Include Storybook setup?",
    default: false,
    group: "Options",
  },
  {
    name: "withCli",
    type: "confirm",
    message: "Include CLI binary entry point?",
    default: false,
    when: (answers) => answers.type === "tool-ts",
    group: "Options",
  },
  {
    name: "runInstall",
    type: "confirm",
    message: "Run package manager install after creation?",
    default: true,
    group: "Post-setup",
  },
];

// =============================================================================
// Generator Definition
// =============================================================================

export const generator: GeneratorDefinition<PackageAnswers> = {
  meta: {
    name: "package",
    description:
      "Generate a new npm package with proper configuration for the pragma monorepo",
    version: "0.1.0",
    help: `Generate a new npm package with proper configuration.

PACKAGE TYPES:
  tool-ts        TypeScript tool that runs directly from src/ (no build step)
                 License: GPL-3.0, Entry: src/index.ts
                 Examples: summon, webarchitect

  library        Plain TypeScript library with dist/ build output
                 License: LGPL-3.0, Entry: dist/esm/index.js

  react-library  React component library with dist/ build
                 License: LGPL-3.0, Entry: dist/esm/index.js
                 peerDeps: react, react-dom
                 Vite: @vitejs/plugin-react + jsdom

  css            CSS-only package (no TypeScript, no build)
                 License: LGPL-3.0, Entry: src/index.css
                 Examples: styles/primitives, styles/modes

OPTIONS:
  --with-storybook  Add Storybook configuration
  --with-cli        Add CLI binary entry point src/cli.ts (tool-ts only)

The generator auto-detects:
  - Monorepo: Uses lerna.json version when in pragma monorepo
  - Package manager: Detects bun/yarn/pnpm (defaults to bun)`,
    examples: [
      "summon package --name=@canonical/my-tool --type=tool-ts",
      "summon package --name=@canonical/my-lib --type=library",
      "summon package --name=@canonical/my-react-lib --type=react-library",
      "summon package --name=@canonical/my-react-lib --type=react-library --with-storybook",
      "summon package --name=@canonical/my-cli --type=tool-ts --with-cli",
      "summon package --name=my-styles --type=css",
      "summon package --name=@canonical/my-pkg --type=library --no-run-install",
    ],
  },

  prompts,

  generate: (answers) => {
    const packageDir = getPackageShortName(answers.name);
    const cwd = process.cwd();
    const isCss = answers.type === "css";
    const isReact = answers.type === "react-library";
    const needsTs = !isCss;

    return flatMap(detectMonorepo(cwd), (monorepoInfo) => {
      const ctx = createTemplateContext(answers, monorepoInfo);

      return sequence_([
        info(`Creating package: ${answers.name}`),
        info(`Type: ${answers.type}`),
        when(
          monorepoInfo.isMonorepo,
          info(`Monorepo detected, using version: ${monorepoInfo.version}`),
        ),

        // Create directory structure
        mkdir(packageDir),
        mkdir(path.join(packageDir, "src")),
        when(isReact, mkdir(path.join(packageDir, "src", "lib"))),
        when(isReact, mkdir(path.join(packageDir, "src", "assets"))),
        // Create package.json
        template({
          source: templates.packageJson,
          dest: path.join(packageDir, "package.json"),
          vars: ctx,
        }),

        // Create tsconfig.json — separate per type
        when(
          isReact,
          template({
            source: templates.tsconfigBuildReact,
            dest: path.join(packageDir, "tsconfig.build.json"),
            vars: ctx,
          }),
        ),
        when(
          isReact,
          template({
            source: templates.tsconfigReact,
            dest: path.join(packageDir, "tsconfig.json"),
            vars: ctx,
          }),
        ),
        when(
          needsTs && !isReact,
          template({
            source: templates.tsconfig,
            dest: path.join(packageDir, "tsconfig.json"),
            vars: ctx,
          }),
        ),

        // Create biome.json
        template({
          source: templates.biome,
          dest: path.join(packageDir, "biome.json"),
          vars: ctx,
        }),

        // Create vite configs for react-library
        when(
          isReact,
          template({
            source: templates.viteConfigReact,
            dest: path.join(packageDir, "vite.config.ts"),
            vars: ctx,
          }),
        ),
        when(
          isReact,
          template({
            source: templates.vitestSetupReact,
            dest: path.join(packageDir, "vitest.setup.ts"),
            vars: ctx,
          }),
        ),

        // Create src/index.ts (for TS packages)
        when(
          needsTs,
          template({
            source: templates.indexTs,
            dest: path.join(packageDir, "src", "index.ts"),
            vars: ctx,
          }),
        ),

        // Create src/index.css (for CSS packages)
        when(
          isCss,
          template({
            source: templates.indexCss,
            dest: path.join(packageDir, "src", "index.css"),
            vars: ctx,
          }),
        ),

        // Create src/cli.ts (tool-ts only; prompt is already gated)
        when(
          answers.withCli,
          template({
            source: templates.cliTs,
            dest: path.join(packageDir, "src", "cli.ts"),
            vars: ctx,
          }),
        ),

        // Create README.md
        template({
          source: templates.readme,
          dest: path.join(packageDir, "README.md"),
          vars: ctx,
        }),

        // Create .storybook folder (React storybook)
        when(answers.withStorybook, mkdir(path.join(packageDir, ".storybook"))),
        when(answers.withStorybook, mkdir(path.join(packageDir, "public"))),
        when(
          answers.withStorybook,
          template({
            source: templates.storybookMainReact,
            dest: path.join(packageDir, ".storybook", "main.ts"),
            vars: ctx,
          }),
        ),
        when(
          answers.withStorybook,
          template({
            source: templates.storybookPreviewReact,
            dest: path.join(packageDir, ".storybook", "preview.ts"),
            vars: ctx,
          }),
        ),
        when(
          answers.withStorybook,
          template({
            source: templates.storybookStylesReact,
            dest: path.join(packageDir, ".storybook", "styles.css"),
            vars: ctx,
          }),
        ),

        info(`Package created at ./${packageDir}`),

        // Run install (conditional)
        when(
          answers.runInstall,
          flatMap(detectPackageManager(cwd), (pm) => {
            return sequence_([
              info(`Running ${pm} install...`),
              flatMap(exec(pm, ["install"], packageDir), () =>
                info(`Dependencies installed successfully`),
              ),
            ]);
          }),
        ),

        when(!answers.runInstall, info("Skipping install step")),

        info(""),
        info("Next steps:"),
        info(`  cd ${packageDir}`),
        info("  bun run check"),
        info(""),
      ]);
    });
  },
};

export default generator;
