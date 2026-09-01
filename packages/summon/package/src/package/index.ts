/**
 * Package Generator
 *
 * Generates a new npm package with proper configuration for the pragma monorepo.
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type GeneratorDefinition,
  loadTemplateSync,
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

import {
  createTemplateContext,
  detectMonorepo,
  detectPackageManager,
  getPackageShortName,
  PACKAGE_NAME,
  type PackageAnswers,
  packageVersion,
  resolveAnswers,
  type TemplateContext,
  validatePackageName,
} from "../shared/index.js";

// =============================================================================
// Template Paths
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "..", "templates");

const load = (...segments: string[]) =>
  loadTemplateSync(path.join(templatesDir, ...segments));

/** Templates every package type shares, whatever its framework. */
function loadSharedTemplates() {
  return {
    packageJson: load("package.json.ejs"),
    tsconfig: load("tsconfig.json.ejs"),
    tsconfigReact: load("tsconfig-react.json.ejs"),
    tsconfigBuild: load("tsconfig.build.json.ejs"),
    biome: load("biome.json.ejs"),
    vitestConfig: load("vitest.config.ts.ejs"),
    indexTs: load("index.ts.ejs"),
    indexTest: load("index.test.ts.ejs"),
    indexCss: load("index.css.ejs"),
    cliTs: load("cli.ts.ejs"),
    readme: load("README.md.ejs"),
    storybookMain: load("storybook-main.ts.ejs"),
    storybookPreview: load("storybook-preview.ts.ejs"),
    pullRequestTemplate: load("PULL_REQUEST_TEMPLATE.md.ejs"),
  };
}

/** The React library arm's sample component and its entry point. */
function loadReactTemplates() {
  return {
    indexTs: load("react", "index.ts.ejs"),
    exampleIndex: load("react", "Example.index.ts.ejs"),
    exampleTypes: load("react", "Example.types.ts.ejs"),
    exampleComponent: load("react", "Example.tsx.ejs"),
    exampleTest: load("react", "Example.test.tsx.ejs"),
  };
}

/**
 * The Svelte library arm. It replaces more than the sample: `@sveltejs/package`
 * owns the build, `svelte-check` owns the type check and the three Vitest
 * projects own the tests, so the manifest and every config file differ from
 * the `tsc` arms rather than branching inside them.
 */
function loadSvelteTemplates() {
  return {
    packageJson: load("svelte", "package.json.ejs"),
    svelteConfig: load("svelte", "svelte.config.js.ejs"),
    viteConfig: load("svelte", "vite.config.ts.ejs"),
    tsconfig: load("svelte", "tsconfig.json.ejs"),
    tsconfigBuild: load("svelte", "tsconfig.build.json.ejs"),
    vitestSetupClient: load("svelte", "vitest-setup-client.ts.ejs"),
    indexTs: load("svelte", "index.ts.ejs"),
    greeting: load("svelte", "greeting.ts.ejs"),
    greetingTest: load("svelte", "greeting.test.ts.ejs"),
    exampleIndex: load("svelte", "Example.index.ts.ejs"),
    exampleTypes: load("svelte", "Example.types.ts.ejs"),
    exampleComponent: load("svelte", "Example.svelte.ejs"),
    exampleSsrTest: load("svelte", "Example.ssr.test.ts.ejs"),
    exampleClientTest: load("svelte", "Example.svelte.test.ts.ejs"),
  };
}

/**
 * Memoized template bundles — loaded on the FIRST `generate()` call that needs
 * them, never at module eval, so importing this generator reads no template
 * (the READ-command discipline every generator package follows) and a `react`
 * run never opens a Svelte template.
 */
const memoize = <T>(loader: () => T): (() => T) => {
  let cache: T | undefined;
  return () => {
    cache ??= loader();
    return cache;
  };
};

const sharedTemplates = memoize(loadSharedTemplates);
const reactTemplates = memoize(loadReactTemplates);
const svelteTemplates = memoize(loadSvelteTemplates);

/** Render one template to `dest`, relative to the package directory. */
const writeTemplate = (
  loaded: { source: string; content: string },
  ctx: TemplateContext,
  ...dest: string[]
): Task<void> =>
  template({
    source: loaded.source,
    content: loaded.content,
    dest: path.join(...dest),
    vars: ctx,
  });

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
    message: "UI framework (library packages only):",
    choices: [
      { label: "none - plain TypeScript library", value: "none" },
      { label: "react - React component library", value: "react" },
      {
        label: "svelte - Svelte component library (@sveltejs/package)",
        value: "svelte",
      },
    ],
    default: "none",
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
// Per-framework file sets
// =============================================================================

/**
 * The `tsc` arms — a plain TypeScript library, a `tool-ts` tool, or a React
 * component library. They share one manifest, one build and one Vitest run;
 * only the sample sources and the tsconfig flavour differ.
 */
function generateTscPackage(
  ctx: TemplateContext,
  packageDir: string,
): Task<void> {
  const t = sharedTemplates();
  const isCss = ctx.type === "css";
  const needsTs = !isCss;
  const isReact = ctx.framework === "react";
  const src = path.join(packageDir, "src");
  const example = path.join(src, "Example");

  // The sample sources: a component tree for React, a module for everything
  // else, nothing at all for CSS (which gets `index.css` below instead).
  const sample = (): Task<void>[] => {
    if (!needsTs) return [];
    if (!isReact) {
      return [
        writeTemplate(t.indexTs, ctx, src, "index.ts"),
        writeTemplate(t.indexTest, ctx, src, "index.test.ts"),
      ];
    }
    const r = reactTemplates();
    return [
      writeTemplate(r.indexTs, ctx, src, "index.ts"),
      mkdir(example),
      writeTemplate(r.exampleIndex, ctx, example, "index.ts"),
      writeTemplate(r.exampleTypes, ctx, example, "types.ts"),
      writeTemplate(r.exampleComponent, ctx, example, "Example.tsx"),
      writeTemplate(r.exampleTest, ctx, example, "Example.test.tsx"),
    ];
  };

  return sequence_([
    mkdir(packageDir),
    mkdir(src),

    writeTemplate(t.packageJson, ctx, packageDir, "package.json"),

    // tsconfig.json — the React flavour carries the JSX settings and the
    // `.tsx` include; everything else uses the plain one.
    ...(needsTs
      ? [
          writeTemplate(
            isReact ? t.tsconfigReact : t.tsconfig,
            ctx,
            packageDir,
            "tsconfig.json",
          ),
        ]
      : []),

    // tsconfig.build.json (only for types that emit to dist/)
    ...(ctx.needsBuild
      ? [writeTemplate(t.tsconfigBuild, ctx, packageDir, "tsconfig.build.json")]
      : []),

    writeTemplate(t.biome, ctx, packageDir, "biome.json"),

    // Vitest config — CSS packages have no tests to configure.
    ...(needsTs
      ? [writeTemplate(t.vitestConfig, ctx, packageDir, "vitest.config.ts")]
      : []),

    ...sample(),

    ...(isCss ? [writeTemplate(t.indexCss, ctx, src, "index.css")] : []),

    when(needsTs && ctx.withCli, writeTemplate(t.cliTs, ctx, src, "cli.ts")),

    writeTemplate(t.readme, ctx, packageDir, "README.md"),
  ]);
}

/**
 * The Svelte arm. `svelte-package` compiles `src/lib` into a flat `dist/`, so
 * the sources live one level deeper than the `tsc` arms — a layout the build
 * tool dictates, not a house style.
 */
function generateSveltePackage(
  ctx: TemplateContext,
  packageDir: string,
): Task<void> {
  const t = sharedTemplates();
  const s = svelteTemplates();
  const lib = path.join(packageDir, "src", "lib");
  const example = path.join(lib, "Example");

  return sequence_([
    mkdir(packageDir),
    mkdir(path.join(packageDir, "src")),
    mkdir(lib),
    mkdir(example),

    writeTemplate(s.packageJson, ctx, packageDir, "package.json"),
    writeTemplate(s.svelteConfig, ctx, packageDir, "svelte.config.js"),
    writeTemplate(s.viteConfig, ctx, packageDir, "vite.config.ts"),
    writeTemplate(s.tsconfig, ctx, packageDir, "tsconfig.json"),
    writeTemplate(s.tsconfigBuild, ctx, packageDir, "tsconfig.build.json"),
    writeTemplate(t.biome, ctx, packageDir, "biome.json"),
    writeTemplate(
      s.vitestSetupClient,
      ctx,
      packageDir,
      "vitest-setup-client.ts",
    ),

    writeTemplate(s.indexTs, ctx, lib, "index.ts"),
    writeTemplate(s.greeting, ctx, lib, "greeting.ts"),
    writeTemplate(s.greetingTest, ctx, lib, "greeting.test.ts"),
    writeTemplate(s.exampleIndex, ctx, example, "index.ts"),
    writeTemplate(s.exampleTypes, ctx, example, "types.ts"),
    writeTemplate(s.exampleComponent, ctx, example, "Example.svelte"),
    writeTemplate(s.exampleSsrTest, ctx, example, "Example.ssr.test.ts"),
    writeTemplate(s.exampleClientTest, ctx, example, "Example.svelte.test.ts"),

    writeTemplate(t.readme, ctx, packageDir, "README.md"),
  ]);
}

// =============================================================================
// Generator Definition
// =============================================================================

export const generator: GeneratorDefinition<PackageAnswers> = {
  meta: {
    name: "package",
    displayName: PACKAGE_NAME,
    description:
      "Generate a new npm package with proper configuration for the pragma monorepo",
    version: packageVersion(),
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

FRAMEWORKS (--framework, library packages only):
  none      Plain TypeScript library built with tsc (the default)
  react     React component library: JSX config, a sample component and a
            jsdom Vitest run
  svelte    Svelte 5 component library built with @sveltejs/package: a flat
            dist/ with the 'svelte' export condition, svelte-check, and
            client/SSR/server Vitest projects

  A framework on a non-library type, or 'svelte' together with --with-cli,
  is coerced with a warning rather than rejected.

OPTIONS:
  --framework       UI framework for a library: none, react or svelte
  --with-storybook  Add Storybook configuration
  --with-cli        Add CLI binary entry point (src/cli.ts)
  --with-pr-template  Add .github/PULL_REQUEST_TEMPLATE.md (for standalone
                      repos; monorepos read only the root template)

The generator auto-detects:
  - Monorepo: walks up to the nearest lerna.json, pnpm-workspace.yaml, or
    package.json "workspaces" root and uses its version
  - Package manager: nearest lockfile wins, walking up from the current
    directory (bun > pnpm > yarn > npm within a directory; defaults to bun)`,
    examples: [
      "summon package --name=@canonical/my-tool --type=tool-ts",
      "summon package --name=@canonical/my-lib --type=library --framework=react",
      "summon package --name=@canonical/my-ui --type=library --framework=svelte",
      "summon package --name=@canonical/my-cli --type=tool-ts --with-cli",
      "summon package --name=my-styles --type=css",
      "summon package --name=@canonical/my-pkg --type=library --no-run-install",
    ],
  },

  prompts,

  generate: (rawAnswers) => {
    const { answers, warnings } = resolveAnswers(rawAnswers);
    const packageDir = getPackageShortName(answers.name);
    const cwd = process.cwd();

    return flatMap(detectMonorepo(cwd), (monorepoInfo) => {
      const ctx = createTemplateContext(answers, monorepoInfo);
      const t = sharedTemplates();

      return sequence_([
        ...warnings.map(warn),
        info(`Creating package: ${answers.name}`),
        info(`Type: ${answers.type}`),
        when(ctx.framework !== "none", info(`Framework: ${ctx.framework}`)),
        when(
          monorepoInfo.isMonorepo,
          info(`Monorepo detected, using version: ${monorepoInfo.version}`),
        ),

        ctx.framework === "svelte"
          ? generateSveltePackage(ctx, packageDir)
          : generateTscPackage(ctx, packageDir),

        // Create .github/PULL_REQUEST_TEMPLATE.md (opt-in: monorepos read
        // only the repo-root template, so per-package copies are dead weight)
        when(answers.withPrTemplate, mkdir(path.join(packageDir, ".github"))),
        when(
          answers.withPrTemplate,
          writeTemplate(
            t.pullRequestTemplate,
            ctx,
            packageDir,
            ".github",
            "PULL_REQUEST_TEMPLATE.md",
          ),
        ),

        // Create .storybook folder (conditional)
        when(answers.withStorybook, mkdir(path.join(packageDir, ".storybook"))),
        when(
          answers.withStorybook,
          mkdir(path.join(packageDir, "src", "assets")),
        ),
        when(answers.withStorybook, mkdir(path.join(packageDir, "public"))),
        when(
          answers.withStorybook,
          writeTemplate(
            t.storybookMain,
            ctx,
            packageDir,
            ".storybook",
            "main.ts",
          ),
        ),
        when(
          answers.withStorybook,
          writeTemplate(
            t.storybookPreview,
            ctx,
            packageDir,
            ".storybook",
            "preview.ts",
          ),
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
