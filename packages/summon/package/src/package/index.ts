/**
 * Package Generator
 *
 * Generates a new npm package with proper configuration for the pragma monorepo.
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type GeneratorDefinition,
  type PromptDefinition,
  template,
} from "@canonical/summon-core";
import {
  exec,
  flatMap,
  info,
  mkdir,
  sequence_,
  type Task,
  warn,
  when,
} from "@canonical/task";
import pkg from "../../package.json" with { type: "json" };

import {
  createTemplateContext,
  detectMonorepo,
  detectPackageManager,
  getPackageShortName,
  type PackageAnswers,
  resolveFramework,
  type TemplateContext,
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
  tsconfigBuild: path.join(templatesDir, "tsconfig.build.json.ejs"),
  biome: path.join(templatesDir, "biome.json.ejs"),
  indexTs: path.join(templatesDir, "index.ts.ejs"),
  indexTest: path.join(templatesDir, "index.test.ts.ejs"),
  indexCss: path.join(templatesDir, "index.css.ejs"),
  cliTs: path.join(templatesDir, "cli.ts.ejs"),
  readme: path.join(templatesDir, "README.md.ejs"),
  storybookMain: path.join(templatesDir, "storybook-main.ts.ejs"),
  storybookPreview: path.join(templatesDir, "storybook-preview.ts.ejs"),
  pullRequestTemplate: path.join(templatesDir, "PULL_REQUEST_TEMPLATE.md.ejs"),
  react: {
    tsconfig: path.join(templatesDir, "react", "tsconfig.json.ejs"),
    tsconfigBuild: path.join(templatesDir, "react", "tsconfig.build.json.ejs"),
    vitestConfig: path.join(templatesDir, "react", "vitest.config.ts.ejs"),
    vitestSetup: path.join(templatesDir, "react", "vitest.setup.ts.ejs"),
    indexTs: path.join(templatesDir, "react", "index.ts.ejs"),
    libIndexTs: path.join(templatesDir, "react", "lib.index.ts.ejs"),
    exampleTsx: path.join(templatesDir, "react", "Example.tsx.ejs"),
    exampleTypes: path.join(templatesDir, "react", "Example.types.ts.ejs"),
    exampleIndex: path.join(templatesDir, "react", "Example.index.ts.ejs"),
    exampleTest: path.join(templatesDir, "react", "Example.test.tsx.ejs"),
  },
  svelte: {
    packageJson: path.join(templatesDir, "svelte", "package.json.ejs"),
    svelteConfig: path.join(templatesDir, "svelte", "svelte.config.js.ejs"),
    tsconfig: path.join(templatesDir, "svelte", "tsconfig.json.ejs"),
    tsconfigBuild: path.join(templatesDir, "svelte", "tsconfig.build.json.ejs"),
    viteConfig: path.join(templatesDir, "svelte", "vite.config.ts.ejs"),
    vitestSetupClient: path.join(
      templatesDir,
      "svelte",
      "vitest-setup-client.ts.ejs",
    ),
    biome: path.join(templatesDir, "svelte", "biome.json.ejs"),
    readme: path.join(templatesDir, "svelte", "README.md.ejs"),
    indexTs: path.join(templatesDir, "svelte", "index.ts.ejs"),
    indexTest: path.join(templatesDir, "svelte", "index.test.ts.ejs"),
    exampleSvelte: path.join(templatesDir, "svelte", "Example.svelte.ejs"),
    exampleTypes: path.join(templatesDir, "svelte", "Example.types.ts.ejs"),
    exampleIndex: path.join(templatesDir, "svelte", "Example.index.ts.ejs"),
    exampleStyles: path.join(templatesDir, "svelte", "Example.styles.css.ejs"),
    exampleClientTest: path.join(
      templatesDir,
      "svelte",
      "Example.client.test.ts.ejs",
    ),
    exampleSsrTest: path.join(
      templatesDir,
      "svelte",
      "Example.ssr.test.ts.ejs",
    ),
    exampleStories: path.join(
      templatesDir,
      "svelte",
      "Example.stories.svelte.ejs",
    ),
    storybookMain: path.join(templatesDir, "svelte", "storybook-main.ts.ejs"),
  },
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
    name: "framework",
    type: "select",
    message: "Component framework:",
    choices: [
      { label: "none - plain TypeScript library", value: "none" },
      { label: "react - React component library", value: "react" },
      {
        label: "svelte - Svelte component library (built with svelte-package)",
        value: "svelte",
      },
    ],
    default: "none",
    when: (answers) => answers.type === "library",
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
    name: "withPrTemplate",
    type: "confirm",
    message: "Include a .github/PULL_REQUEST_TEMPLATE.md?",
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
// Task builders
// =============================================================================

/**
 * Tasks for tool-ts / css / plain (framework=none) library packages.
 */
function baseTasks(
  ctx: TemplateContext,
  answers: PackageAnswers,
  packageDir: string,
): Task<void>[] {
  const isCss = answers.type === "css";
  const needsTs = !isCss;
  const t = (source: string, dest: string): Task<void> =>
    template({ source, dest: path.join(packageDir, dest), vars: ctx });

  return [
    mkdir(packageDir),
    mkdir(path.join(packageDir, "src")),
    t(templates.packageJson, "package.json"),
    when(needsTs, t(templates.tsconfig, "tsconfig.json")),
    when(
      answers.type === "library",
      t(templates.tsconfigBuild, "tsconfig.build.json"),
    ),
    t(templates.biome, "biome.json"),
    when(needsTs, t(templates.indexTs, path.join("src", "index.ts"))),
    when(needsTs, t(templates.indexTest, path.join("src", "index.test.ts"))),
    when(isCss, t(templates.indexCss, path.join("src", "index.css"))),
    when(
      needsTs && answers.withCli,
      t(templates.cliTs, path.join("src", "cli.ts")),
    ),
    t(templates.readme, "README.md"),
  ];
}

/**
 * Tasks for a React component library (type=library, framework=react).
 */
function reactTasks(ctx: TemplateContext, packageDir: string): Task<void>[] {
  const exampleDir = path.join("src", "lib", "Example");
  const t = (source: string, dest: string): Task<void> =>
    template({ source, dest: path.join(packageDir, dest), vars: ctx });

  return [
    mkdir(packageDir),
    mkdir(path.join(packageDir, "src")),
    mkdir(path.join(packageDir, "src", "lib")),
    mkdir(path.join(packageDir, exampleDir)),
    t(templates.packageJson, "package.json"),
    t(templates.react.tsconfig, "tsconfig.json"),
    t(templates.react.tsconfigBuild, "tsconfig.build.json"),
    t(templates.react.vitestConfig, "vitest.config.ts"),
    t(templates.react.vitestSetup, "vitest.setup.ts"),
    t(templates.biome, "biome.json"),
    t(templates.readme, "README.md"),
    t(templates.react.indexTs, path.join("src", "index.ts")),
    t(templates.react.libIndexTs, path.join("src", "lib", "index.ts")),
    t(templates.react.exampleTsx, path.join(exampleDir, "Example.tsx")),
    t(templates.react.exampleTypes, path.join(exampleDir, "types.ts")),
    t(templates.react.exampleIndex, path.join(exampleDir, "index.ts")),
    t(templates.react.exampleTest, path.join(exampleDir, "Example.test.tsx")),
  ];
}

/**
 * Tasks for a Svelte component library (type=library, framework=svelte),
 * built with svelte-package. Svelte owns its own package.json, configs and
 * Storybook wiring because its layout (src/lib build input, no src/ root
 * sources) diverges from the tsc-built variants.
 */
function svelteTasks(
  ctx: TemplateContext,
  answers: PackageAnswers,
  packageDir: string,
): Task<void>[] {
  const exampleDir = path.join("src", "lib", "Example");
  const t = (source: string, dest: string): Task<void> =>
    template({ source, dest: path.join(packageDir, dest), vars: ctx });
  const { svelte } = templates;

  return [
    mkdir(packageDir),
    mkdir(path.join(packageDir, "src", "lib")),
    mkdir(path.join(packageDir, exampleDir)),
    t(svelte.packageJson, "package.json"),
    t(svelte.svelteConfig, "svelte.config.js"),
    t(svelte.tsconfig, "tsconfig.json"),
    t(svelte.tsconfigBuild, "tsconfig.build.json"),
    t(svelte.viteConfig, "vite.config.ts"),
    t(svelte.vitestSetupClient, "vitest-setup-client.ts"),
    t(svelte.biome, "biome.json"),
    t(svelte.readme, "README.md"),
    t(svelte.indexTs, path.join("src", "lib", "index.ts")),
    t(svelte.indexTest, path.join("src", "lib", "index.test.ts")),
    t(svelte.exampleSvelte, path.join(exampleDir, "Example.svelte")),
    t(svelte.exampleTypes, path.join(exampleDir, "types.ts")),
    t(svelte.exampleIndex, path.join(exampleDir, "index.ts")),
    t(svelte.exampleStyles, path.join(exampleDir, "styles.css")),
    t(
      svelte.exampleClientTest,
      path.join(exampleDir, "Example.svelte.test.ts"),
    ),
    t(svelte.exampleSsrTest, path.join(exampleDir, "Example.ssr.test.ts")),
    when(answers.withStorybook, mkdir(path.join(packageDir, ".storybook"))),
    when(
      answers.withStorybook,
      t(svelte.storybookMain, path.join(".storybook", "main.ts")),
    ),
    when(
      answers.withStorybook,
      t(templates.storybookPreview, path.join(".storybook", "preview.ts")),
    ),
    when(
      answers.withStorybook,
      t(svelte.exampleStories, path.join(exampleDir, "Example.stories.svelte")),
    ),
  ];
}

/**
 * Storybook wiring shared by the tsc-built variants (tool-ts / plain library /
 * react). Svelte handles its own Storybook files in `svelteTasks`.
 */
function sharedStorybookTasks(
  ctx: TemplateContext,
  packageDir: string,
): Task<void>[] {
  const t = (source: string, dest: string): Task<void> =>
    template({ source, dest: path.join(packageDir, dest), vars: ctx });

  return [
    mkdir(path.join(packageDir, ".storybook")),
    mkdir(path.join(packageDir, "src", "assets")),
    mkdir(path.join(packageDir, "public")),
    t(templates.storybookMain, path.join(".storybook", "main.ts")),
    t(templates.storybookPreview, path.join(".storybook", "preview.ts")),
  ];
}

// =============================================================================
// Generator Definition
// =============================================================================

export const generator: GeneratorDefinition<PackageAnswers> = {
  meta: {
    name: "package",
    displayName: `${pkg.name}`,
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
  --framework       Component framework for a library: none|react|svelte
                    (react → tsc build, svelte → svelte-package build)
  --with-storybook  Add Storybook configuration
  --with-cli        Add CLI binary entry point (src/cli.ts)
  --with-pr-template  Add .github/PULL_REQUEST_TEMPLATE.md (for standalone
                      repos; monorepos read only the root template)

The generator auto-detects:
  - Monorepo: Uses lerna.json version when in pragma monorepo
  - Package manager: Detects bun/yarn/pnpm (defaults to bun)`,
    examples: [
      "summon package --name=@canonical/my-tool --type=tool-ts",
      "summon package --name=@canonical/my-lib --type=library --framework=react",
      "summon package --name=@canonical/my-svelte-lib --type=library --framework=svelte",
      "summon package --name=@canonical/my-cli --type=tool-ts --with-cli",
      "summon package --name=my-styles --type=css",
      "summon package --name=@canonical/my-pkg --type=library --no-run-install",
    ],
  },

  prompts,

  generate: (rawAnswers) => {
    const { answers, warnings } = resolveFramework(rawAnswers);
    const { framework } = answers;
    const packageDir = getPackageShortName(answers.name);
    const cwd = process.cwd();

    return flatMap(detectMonorepo(cwd), (monorepoInfo) => {
      const ctx = createTemplateContext(answers, monorepoInfo);

      const frameworkTasks =
        framework === "svelte"
          ? svelteTasks(ctx, answers, packageDir)
          : framework === "react"
            ? reactTasks(ctx, packageDir)
            : baseTasks(ctx, answers, packageDir);

      // Svelte wires its own Storybook (svelte-CSF stories + svelte preset).
      const storybookTasks =
        answers.withStorybook && framework !== "svelte"
          ? sharedStorybookTasks(ctx, packageDir)
          : [];

      const prTemplateTasks = answers.withPrTemplate
        ? [
            mkdir(path.join(packageDir, ".github")),
            template({
              source: templates.pullRequestTemplate,
              dest: path.join(
                packageDir,
                ".github",
                "PULL_REQUEST_TEMPLATE.md",
              ),
              vars: ctx,
            }),
          ]
        : [];

      return sequence_([
        ...warnings.map((message) => warn(message)),
        info(`Creating package: ${answers.name}`),
        info(`Type: ${answers.type}`),
        when(
          monorepoInfo.isMonorepo,
          info(`Monorepo detected, using version: ${monorepoInfo.version}`),
        ),

        ...frameworkTasks,
        ...storybookTasks,
        ...prTemplateTasks,

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
