/**
 * Svelte Component Generator
 *
 * Generates a Svelte 5 component with a consistent file structure:
 * - `ComponentName.svelte` - Main component file with Svelte 5 runes ($props)
 * - `types.ts` - TypeScript types and props interface
 * - `index.ts` - Barrel export
 * - `ComponentName.svelte.test.ts` - Unit tests with @testing-library/svelte
 * - `ComponentName.ssr.test.ts` - SSR tests (optional)
 * - `ComponentName.stories.svelte` - Svelte CSF stories (optional)
 * - `ComponentName.stories.ts` - TypeScript stories (optional, alternative to Svelte CSF)
 * - `styles.css` - CSS styles (optional)
 *
 * @example
 * ```bash
 * summon component svelte --component-path=src/lib/components/Button
 * summon component svelte --component-path=src/lib/components/Card --with-stories
 * summon component svelte --component-path=src/lib/components/Modal --with-stories --use-ts-stories
 * ```
 *
 * @module
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { type GeneratorDefinition, template } from "@canonical/summon-core";
import { debug, info, mkdir, sequence_, when } from "@canonical/task";

import {
  appendExportToParentIndex,
  createComponentPathPrompt,
  createTemplateContext,
  getComponentName,
  getParentDir,
  PACKAGE_NAME,
  sharedPrompts,
} from "../shared/index.js";
import { loadTemplateSync } from "../shared/loadTemplate.js";
import type { SvelteComponentAnswers } from "./types.js";

// =============================================================================
// Template Paths & Content (loaded LAZILY on first generate())
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "..", "templates");

/** Read every Svelte template from disk (or the embedded manifest). */
function loadSvelteTemplates() {
  return {
    component: loadTemplateSync(
      path.join(templatesDir, "svelte", "component.svelte.ejs"),
    ),
    types: loadTemplateSync(path.join(templatesDir, "svelte", "types.ts.ejs")),
    index: loadTemplateSync(path.join(templatesDir, "svelte", "index.ts.ejs")),
    test: loadTemplateSync(path.join(templatesDir, "svelte", "test.ts.ejs")),
    ssrTest: loadTemplateSync(
      path.join(templatesDir, "svelte", "ssr.test.ts.ejs"),
    ),
    storiesSvelte: loadTemplateSync(
      path.join(templatesDir, "svelte", "stories.svelte.ejs"),
    ),
    storiesTs: loadTemplateSync(
      path.join(templatesDir, "svelte", "stories.ts.ejs"),
    ),
    styles: loadTemplateSync(
      path.join(templatesDir, "shared", "styles.css.ejs"),
    ),
  };
}

/**
 * Memoized template bundle. Loaded on the FIRST `generate()` call, never at
 * module-eval — so importing this generator never reads a template, and a READ
 * command (which never calls `generate()`) never touches the `.ejs` a compiled
 * binary lacks. See the react generator for the full rationale.
 */
let svelteTemplatesCache: ReturnType<typeof loadSvelteTemplates> | undefined;
function svelteTemplates(): ReturnType<typeof loadSvelteTemplates> {
  svelteTemplatesCache ??= loadSvelteTemplates();
  return svelteTemplatesCache;
}

// =============================================================================
// Generator Definition
// =============================================================================

/**
 * Svelte component generator definition.
 *
 * This generator creates a complete Svelte 5 component with TypeScript support,
 * runes ($props), testing infrastructure, and optional Storybook stories.
 *
 * @see {@link https://summon.dev/generators/component/svelte} for documentation
 */
const generator = {
  meta: {
    name: "component/svelte",
    displayName: `${PACKAGE_NAME}:svelte`,
    description:
      "Generate a Svelte 5 component with TypeScript, tests, stories, and styles",
    version: "0.1.0",
    help: `Generate a Svelte 5 component with TypeScript, tests, stories, and styles.

FEATURES:
  - Svelte 5 with runes ($props)
  - TypeScript types and props interface
  - Unit tests with @testing-library/svelte
  - Storybook integration (Svelte CSF or TypeScript)
  - CSS styles (optional)
  - SSR tests (optional)
  - Auto-export from parent index.ts

The component name is extracted from the path and must be PascalCase.
For example, 'src/lib/components/Button' creates a 'Button' component.`,
    examples: [
      "summon component svelte --component-path=src/lib/components/Button",
      "summon component svelte --component-path=src/lib/components/Card --with-styles --with-stories",
      "summon component svelte --component-path=src/lib/components/Modal --with-stories --use-ts-stories",
      "summon component svelte --component-path=src/lib/components/Button --dry-run",
    ],
  },

  prompts: [
    createComponentPathPrompt("svelte"),
    ...sharedPrompts,
    {
      name: "useTsStories",
      type: "confirm",
      message: "Use TypeScript stories format? (otherwise Svelte CSF)",
      default: false,
      when: (answers) => answers.withStories === true,
      group: "Options",
    },
  ],

  generate: (answers) => {
    const componentName = getComponentName(answers.componentPath);
    const componentDir = answers.componentPath;
    const parentDir = getParentDir(answers.componentPath);
    const ctx = createTemplateContext(answers, "svelte");
    const t = svelteTemplates();

    return sequence_([
      info(`Generating Svelte component: ${componentName}`),

      debug("Creating component directory"),
      mkdir(componentDir),

      debug("Creating main component file"),
      template({
        source: t.component.source,
        content: t.component.content,
        dest: path.join(componentDir, `${componentName}.svelte`),
        vars: ctx,
      }),

      debug("Creating types file"),
      template({
        source: t.types.source,
        content: t.types.content,
        dest: path.join(componentDir, "types.ts"),
        vars: ctx,
      }),

      debug("Creating index barrel file"),
      template({
        source: t.index.source,
        content: t.index.content,
        dest: path.join(componentDir, "index.ts"),
        vars: ctx,
      }),

      debug("Creating test file"),
      template({
        source: t.test.source,
        content: t.test.content,
        dest: path.join(componentDir, `${componentName}.svelte.test.ts`),
        vars: ctx,
      }),

      when(answers.withSsrTests, debug("Creating SSR test file")),
      when(
        answers.withSsrTests,
        template({
          source: t.ssrTest.source,
          content: t.ssrTest.content,
          dest: path.join(componentDir, `${componentName}.ssr.test.ts`),
          vars: ctx,
        }),
      ),

      when(
        answers.withStories && !answers.useTsStories,
        debug("Creating Svelte CSF stories file"),
      ),
      when(
        answers.withStories && !answers.useTsStories,
        template({
          source: t.storiesSvelte.source,
          content: t.storiesSvelte.content,
          dest: path.join(componentDir, `${componentName}.stories.svelte`),
          vars: ctx,
        }),
      ),

      when(
        answers.withStories && answers.useTsStories,
        debug("Creating TypeScript stories file"),
      ),
      when(
        answers.withStories && answers.useTsStories,
        template({
          source: t.storiesTs.source,
          content: t.storiesTs.content,
          dest: path.join(componentDir, `${componentName}.stories.ts`),
          vars: ctx,
        }),
      ),

      when(answers.withStyles, debug("Creating styles file")),
      when(
        answers.withStyles,
        template({
          source: t.styles.source,
          content: t.styles.content,
          dest: path.join(componentDir, "styles.css"),
          vars: ctx,
        }),
      ),

      debug("Updating parent index.ts with export"),
      appendExportToParentIndex(parentDir, componentName),

      info(`Created ${componentName} component at ${componentDir}`),
    ]);
  },
} as const satisfies GeneratorDefinition<SvelteComponentAnswers>;

export default generator;
