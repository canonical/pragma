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
import {
  debug,
  type GeneratorDefinition,
  info,
  mkdir,
  sequence_,
  template,
  when,
} from "@canonical/summon";

import {
  appendExportToParentIndex,
  createComponentPathPrompt,
  createTemplateContext,
  getComponentName,
  getParentDir,
  sharedPrompts,
} from "../shared/index.js";
import type { SvelteComponentAnswers } from "./types.js";

// =============================================================================
// Template Paths
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "..", "templates");

const svelteTemplates = {
  component: path.join(templatesDir, "svelte", "component.svelte.ejs"),
  types: path.join(templatesDir, "svelte", "types.ts.ejs"),
  index: path.join(templatesDir, "svelte", "index.ts.ejs"),
  test: path.join(templatesDir, "svelte", "test.ts.ejs"),
  ssrTest: path.join(templatesDir, "svelte", "ssr.test.ts.ejs"),
  storiesSvelte: path.join(templatesDir, "svelte", "stories.svelte.ejs"),
  storiesTs: path.join(templatesDir, "svelte", "stories.ts.ejs"),
};

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
export const generator = {
  meta: {
    name: "component/svelte",
    description:
      "Generate a Svelte 5 component with TypeScript, tests, and stories",
    version: "0.1.0",
    help: `Generate a Svelte 5 component with TypeScript, tests, and stories.

FEATURES:
  - Svelte 5 with runes ($props)
  - TypeScript types and props interface
  - Unit tests with @testing-library/svelte
  - Storybook integration (Svelte CSF or TypeScript)
  - Optional scoped styles
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

    return sequence_([
      info(`Generating Svelte component: ${componentName}`),

      debug("Creating component directory"),
      mkdir(componentDir),

      debug("Creating main component file"),
      template({
        source: svelteTemplates.component,
        dest: path.join(componentDir, `${componentName}.svelte`),
        vars: ctx,
      }),

      debug("Creating types file"),
      template({
        source: svelteTemplates.types,
        dest: path.join(componentDir, "types.ts"),
        vars: ctx,
      }),

      debug("Creating index barrel file"),
      template({
        source: svelteTemplates.index,
        dest: path.join(componentDir, "index.ts"),
        vars: ctx,
      }),

      debug("Creating test file"),
      template({
        source: svelteTemplates.test,
        dest: path.join(componentDir, `${componentName}.svelte.test.ts`),
        vars: ctx,
      }),

      when(answers.withSsrTests, debug("Creating SSR test file")),
      when(
        answers.withSsrTests,
        template({
          source: svelteTemplates.ssrTest,
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
          source: svelteTemplates.storiesSvelte,
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
          source: svelteTemplates.storiesTs,
          dest: path.join(componentDir, `${componentName}.stories.ts`),
          vars: ctx,
        }),
      ),

      debug("Updating parent index.ts with export"),
      appendExportToParentIndex(parentDir, componentName),

      info(`Created ${componentName} component at ${componentDir}`),
    ]);
  },
} as const satisfies GeneratorDefinition<SvelteComponentAnswers>;
