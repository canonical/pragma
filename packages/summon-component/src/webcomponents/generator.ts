/**
 * Web Components Generator
 *
 * Generates a Lit web component with a consistent file structure:
 * - `ComponentName.ts` - Main component file (Lit element)
 * - `index.ts` - Barrel export
 * - `ComponentName.tests.ts` - Unit tests with Vitest
 * - `ComponentName.stories.ts` - Storybook stories (optional)
 * - `styles.css` - CSS styles (optional)
 *
 * @example
 * ```bash
 * summon component webcomponents --component-path=src/lib/components/Button
 * summon component webcomponents --component-path=src/lib/components/Card --with-styles --with-stories
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
} from "../shared/index.js";
import type { WebComponentAnswers } from "./types.js";

// =============================================================================
// Template Paths
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "..", "templates");

const webComponentTemplates = {
  component: path.join(templatesDir, "webcomponents", "component.ts.ejs"),
  index: path.join(templatesDir, "webcomponents", "index.ts.ejs"),
  types: path.join(templatesDir, "webcomponents", "types.ts.ejs"),
  tests: path.join(templatesDir, "webcomponents", "tests.ts.ejs"),
  stories: path.join(templatesDir, "webcomponents", "stories.ts.ejs"),
  styles: path.join(templatesDir, "webcomponents", "styles.css.ejs"),
};

// =============================================================================
// Custom Prompts (without SSR tests)
// =============================================================================

const webComponentPrompts = [
  {
    name: "withStyles",
    type: "confirm",
    message: "Include styles?",
    default: true,
    group: "Options",
  },
  {
    name: "withStories",
    type: "confirm",
    message: "Include Storybook stories?",
    default: true,
    group: "Options",
  },
] as const;

// =============================================================================
// Generator Definition
// =============================================================================

/**
 * Web components generator definition.
 *
 * This generator creates a complete Lit web component with TypeScript support,
 * testing infrastructure, and optional Storybook stories and CSS styles.
 *
 * @see {@link https://summon.dev/generators/component/webcomponents} for documentation
 */
export const generator = {
  meta: {
    name: "component/webcomponents",
    description:
      "Generate a Lit web component with TypeScript, tests, stories, and styles",
    version: "0.1.0",
    help: `Generate a Lit web component with TypeScript, tests, stories, and styles.

FEATURES:
  - Lit element with TypeScript decorators
  - Unit tests with Vitest and shadow DOM testing
  - Storybook integration with @storybook/web-components-vite (optional)
  - CSS styles (optional)
  - Auto-export from parent index.ts

The component name is extracted from the path and must be PascalCase.
For example, 'src/lib/components/Button' creates a 'Button' component
with the custom element tag 'button'.`,
    examples: [
      "summon component webcomponents --component-path=src/lib/components/Button",
      "summon component webcomponents --component-path=src/lib/components/Card --with-styles --with-stories",
      "summon component webcomponents --component-path=src/lib/components/Modal --no-with-styles",
      "summon component webcomponents --component-path=src/lib/components/Button --dry-run",
    ],
  },

  prompts: [createComponentPathPrompt("webcomponents"), ...webComponentPrompts],

  generate: (answers) => {
    const componentName = getComponentName(answers.componentPath);
    const componentDir = answers.componentPath;
    const parentDir = getParentDir(answers.componentPath);
    const ctx = createTemplateContext(answers, "webcomponents");

    return sequence_([
      info(`Generating Lit web component: ${componentName}`),

      debug("Creating component directory"),
      mkdir(componentDir),

      debug("Creating main component file"),
      template({
        source: webComponentTemplates.component,
        dest: path.join(componentDir, `${componentName}.ts`),
        vars: ctx,
      }),

      debug("Creating index barrel file"),
      template({
        source: webComponentTemplates.index,
        dest: path.join(componentDir, "index.ts"),
        vars: ctx,
      }),

      debug("Creating types file"),
      template({
        source: webComponentTemplates.types,
        dest: path.join(componentDir, "types.ts"),
        vars: ctx,
      }),

      debug("Creating test file"),
      template({
        source: webComponentTemplates.tests,
        dest: path.join(componentDir, `${componentName}.tests.ts`),
        vars: ctx,
      }),

      when(answers.withStories, debug("Creating stories file")),
      when(
        answers.withStories,
        template({
          source: webComponentTemplates.stories,
          dest: path.join(componentDir, `${componentName}.stories.ts`),
          vars: ctx,
        }),
      ),

      when(answers.withStyles, debug("Creating styles file")),
      when(
        answers.withStyles,
        template({
          source: webComponentTemplates.styles,
          dest: path.join(componentDir, "styles.css"),
          vars: ctx,
        }),
      ),

      debug("Updating parent index.ts with export"),
      appendExportToParentIndex(parentDir, componentName),

      info(`Created ${componentName} component at ${componentDir}`),
    ]);
  },
} as const satisfies GeneratorDefinition<WebComponentAnswers>;
