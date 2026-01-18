/**
 * Svelte Component Generator
 *
 * Generates a Svelte 5 component with TypeScript, tests, and stories.
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type GeneratorDefinition,
  info,
  mkdir,
  sequence_,
  template,
  when,
} from "@canonical/summon";

import {
  appendExportToParentIndex,
  type BaseComponentAnswers,
  createComponentPathPrompt,
  createTemplateContext,
  getComponentName,
  getParentDir,
  sharedPrompts,
} from "../shared/index.js";

// =============================================================================
// Types
// =============================================================================

interface SvelteComponentAnswers extends BaseComponentAnswers {
  /** Use TypeScript stories format instead of Svelte CSF */
  useTsStories: boolean;
}

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

export const generator: GeneratorDefinition<SvelteComponentAnswers> = {
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

      // Create directory
      mkdir(componentDir),

      // Create main component file
      template({
        source: svelteTemplates.component,
        dest: path.join(componentDir, `${componentName}.svelte`),
        vars: ctx,
      }),

      // Create types file
      template({
        source: svelteTemplates.types,
        dest: path.join(componentDir, "types.ts"),
        vars: ctx,
      }),

      // Create index file
      template({
        source: svelteTemplates.index,
        dest: path.join(componentDir, "index.ts"),
        vars: ctx,
      }),

      // Create test file
      template({
        source: svelteTemplates.test,
        dest: path.join(componentDir, `${componentName}.svelte.test.ts`),
        vars: ctx,
      }),

      // Create SSR test file (conditional)
      when(
        answers.withSsrTests,
        template({
          source: svelteTemplates.ssrTest,
          dest: path.join(componentDir, `${componentName}.ssr.test.ts`),
          vars: ctx,
        }),
      ),

      // Create stories file (conditional - Svelte CSF format)
      when(
        answers.withStories && !answers.useTsStories,
        template({
          source: svelteTemplates.storiesSvelte,
          dest: path.join(componentDir, `${componentName}.stories.svelte`),
          vars: ctx,
        }),
      ),

      // Create stories file (conditional - TypeScript format)
      when(
        answers.withStories && answers.useTsStories,
        template({
          source: svelteTemplates.storiesTs,
          dest: path.join(componentDir, `${componentName}.stories.ts`),
          vars: ctx,
        }),
      ),

      // Append export to parent index
      appendExportToParentIndex(parentDir, componentName),

      info(`Created ${componentName} component at ${componentDir}`),
    ]);
  },
};

export default generator;
