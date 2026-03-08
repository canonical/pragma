/**
 * React Component Generator
 *
 * Generates a React component with a consistent file structure:
 * - `ComponentName.tsx` - Main component file
 * - `types.ts` - TypeScript types and props interface
 * - `index.ts` - Barrel export
 * - `ComponentName.test.tsx` - Unit tests with @testing-library/react
 * - `ComponentName.ssr.test.tsx` - SSR tests (optional)
 * - `ComponentName.stories.tsx` - Storybook stories (optional)
 * - `styles.css` - CSS styles (optional)
 *
 * @example
 * ```bash
 * summon component react --component-path=src/components/Button
 * summon component react --component-path=src/components/Card --with-styles --with-stories
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
import type { ReactComponentAnswers } from "./types.js";

// =============================================================================
// Template Paths
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "..", "templates");

const reactTemplates = {
  component: path.join(templatesDir, "react", "component.tsx.ejs"),
  types: path.join(templatesDir, "react", "types.ts.ejs"),
  index: path.join(templatesDir, "react", "index.ts.ejs"),
  test: path.join(templatesDir, "react", "test.tsx.ejs"),
  ssrTest: path.join(templatesDir, "react", "ssr.test.tsx.ejs"),
  stories: path.join(templatesDir, "react", "stories.tsx.ejs"),
  styles: path.join(templatesDir, "shared", "styles.css.ejs"),
};

// =============================================================================
// Generator Definition
// =============================================================================

/**
 * React component generator definition.
 *
 * This generator creates a complete React component with TypeScript support,
 * testing infrastructure, and optional Storybook stories and CSS styles.
 *
 * @see {@link https://summon.dev/generators/component/react} for documentation
 */
export const generator = {
  meta: {
    name: "component/react",
    description:
      "Generate a React component with TypeScript, tests, stories, and styles",
    version: "0.1.0",
    help: `Generate a React component with TypeScript, tests, stories, and styles.

FEATURES:
  - TypeScript types and props interface
  - Unit tests with @testing-library/react
  - Storybook integration (optional)
  - CSS styles (optional)
  - SSR tests (optional)
  - Auto-export from parent index.ts

The component name is extracted from the path and must be PascalCase.
For example, 'src/components/Button' creates a 'Button' component.`,
    examples: [
      "summon component react --component-path=src/components/Button",
      "summon component react --component-path=src/components/Card --with-styles --with-stories",
      "summon component react --component-path=src/components/Modal --no-with-ssr-tests",
      "summon component react --component-path=src/components/Button --dry-run",
    ],
  },

  prompts: [createComponentPathPrompt("react"), ...sharedPrompts],

  generate: (answers) => {
    const componentName = getComponentName(answers.componentPath);
    const componentDir = answers.componentPath;
    const parentDir = getParentDir(answers.componentPath);
    const ctx = createTemplateContext(answers, "react");

    return sequence_([
      info(`Generating React component: ${componentName}`),

      debug("Creating component directory"),
      mkdir(componentDir),

      debug("Creating main component file"),
      template({
        source: reactTemplates.component,
        dest: path.join(componentDir, `${componentName}.tsx`),
        vars: ctx,
      }),

      debug("Creating types file"),
      template({
        source: reactTemplates.types,
        dest: path.join(componentDir, "types.ts"),
        vars: ctx,
      }),

      debug("Creating index barrel file"),
      template({
        source: reactTemplates.index,
        dest: path.join(componentDir, "index.ts"),
        vars: ctx,
      }),

      debug("Creating test file"),
      template({
        source: reactTemplates.test,
        dest: path.join(componentDir, `${componentName}.test.tsx`),
        vars: ctx,
      }),

      when(answers.withSsrTests, debug("Creating SSR test file")),
      when(
        answers.withSsrTests,
        template({
          source: reactTemplates.ssrTest,
          dest: path.join(componentDir, `${componentName}.ssr.test.tsx`),
          vars: ctx,
        }),
      ),

      when(answers.withStories, debug("Creating stories file")),
      when(
        answers.withStories,
        template({
          source: reactTemplates.stories,
          dest: path.join(componentDir, `${componentName}.stories.tsx`),
          vars: ctx,
        }),
      ),

      when(answers.withStyles, debug("Creating styles file")),
      when(
        answers.withStyles,
        template({
          source: reactTemplates.styles,
          dest: path.join(componentDir, "styles.css"),
          vars: ctx,
        }),
      ),

      debug("Updating parent index.ts with export"),
      appendExportToParentIndex(parentDir, componentName),

      info(`Created ${componentName} component at ${componentDir}`),
    ]);
  },
} as const satisfies GeneratorDefinition<ReactComponentAnswers>;
