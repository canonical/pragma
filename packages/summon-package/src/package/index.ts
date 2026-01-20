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
  tsconfig: path.join(templatesDir, "tsconfig.json.ejs"),
  tsconfigReact: path.join(templatesDir, "tsconfig-react.json.ejs"),
  biome: path.join(templatesDir, "biome.json.ejs"),
  indexTs: path.join(templatesDir, "index.ts.ejs"),
  indexCss: path.join(templatesDir, "index.css.ejs"),
  cliTs: path.join(templatesDir, "cli.ts.ejs"),
  readme: path.join(templatesDir, "README.md.ejs"),
  storybookMain: path.join(templatesDir, "storybook-main.ts.ejs"),
  storybookPreview: path.join(templatesDir, "storybook-preview.ts.ejs"),
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
        label: "library - Publishable library (dist/ build output)",
        value: "library",
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
    name: "withReact",
    type: "confirm",
    message: "Include React dependencies?",
    default: false,
    group: "Options",
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
  tool-ts   TypeScript tool that runs directly from src/ (no build step)
            License: GPL-3.0, Entry: src/index.ts
            Examples: summon, webarchitect

  library   Publishable library with dist/ build output
            License: LGPL-3.0, Entry: dist/esm/index.js
            Examples: utils, ds-types

  css       CSS-only package (no TypeScript, no build)
            License: LGPL-3.0, Entry: src/index.css
            Examples: styles/primitives, styles/modes

OPTIONS:
  --with-react      Add React dependencies and TypeScript React config
  --with-storybook  Add Storybook configuration
  --with-cli        Add CLI binary entry point (src/cli.ts)

The generator auto-detects:
  - Monorepo: Uses lerna.json version when in pragma monorepo
  - Package manager: Detects bun/yarn/pnpm (defaults to bun)`,
    examples: [
      "summon package --name=@canonical/my-tool --type=tool-ts",
      "summon package --name=@canonical/my-lib --type=library --with-react",
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

        // Create package.json
        template({
          source: templates.packageJson,
          dest: path.join(packageDir, "package.json"),
          vars: ctx,
        }),

        // Create tsconfig.json (only for non-CSS packages)
        when(
          needsTs && answers.withReact,
          template({
            source: templates.tsconfigReact,
            dest: path.join(packageDir, "tsconfig.json"),
            vars: ctx,
          }),
        ),
        when(
          needsTs && !answers.withReact,
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

        // Create src/cli.ts (conditional, only for TS packages)
        when(
          needsTs && answers.withCli,
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

        // Create .storybook folder (conditional)
        when(answers.withStorybook, mkdir(path.join(packageDir, ".storybook"))),
        when(
          answers.withStorybook,
          mkdir(path.join(packageDir, "src", "assets")),
        ),
        when(answers.withStorybook, mkdir(path.join(packageDir, "public"))),
        when(
          answers.withStorybook,
          template({
            source: templates.storybookMain,
            dest: path.join(packageDir, ".storybook", "main.ts"),
            vars: ctx,
          }),
        ),
        when(
          answers.withStorybook,
          template({
            source: templates.storybookPreview,
            dest: path.join(packageDir, ".storybook", "preview.ts"),
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
