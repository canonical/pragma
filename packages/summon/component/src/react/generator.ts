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
 * @module
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { type GeneratorDefinition, template } from "@canonical/summon-core";
import { debug, info, mkdir, sequence_, when } from "@canonical/task";
import pkg from "../../package.json" with { type: "json" };

import {
  appendExportToParentIndex,
  createComponentPathPrompt,
  createTemplateContext,
  getComponentName,
  getParentDir,
  sharedPrompts,
} from "../shared/index.js";
import loadTemplate from "../shared/loadTemplate.js";
import type { ReactComponentAnswers } from "./types.js";

// =============================================================================
// Template Paths & Content (loaded eagerly via top-level await)
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "..", "templates");

const reactTemplates = {
  component: await loadTemplate(
    path.join(templatesDir, "react", "component.tsx.ejs"),
  ),
  types: await loadTemplate(path.join(templatesDir, "react", "types.ts.ejs")),
  index: await loadTemplate(path.join(templatesDir, "react", "index.ts.ejs")),
  test: await loadTemplate(path.join(templatesDir, "react", "test.tsx.ejs")),
  ssrTest: await loadTemplate(
    path.join(templatesDir, "react", "ssr.test.tsx.ejs"),
  ),
  stories: await loadTemplate(
    path.join(templatesDir, "react", "stories.tsx.ejs"),
  ),
  styles: await loadTemplate(
    path.join(templatesDir, "shared", "styles.css.ejs"),
  ),
};

// =============================================================================
// Generator Definition
// =============================================================================

const generator = {
  meta: {
    name: "component/react",
    displayName: `${pkg.name}:react`,
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
        source: reactTemplates.component.source,
        content: reactTemplates.component.content,
        dest: path.join(componentDir, `${componentName}.tsx`),
        vars: ctx,
      }),

      debug("Creating types file"),
      template({
        source: reactTemplates.types.source,
        content: reactTemplates.types.content,
        dest: path.join(componentDir, "types.ts"),
        vars: ctx,
      }),

      debug("Creating index barrel file"),
      template({
        source: reactTemplates.index.source,
        content: reactTemplates.index.content,
        dest: path.join(componentDir, "index.ts"),
        vars: ctx,
      }),

      debug("Creating test file"),
      template({
        source: reactTemplates.test.source,
        content: reactTemplates.test.content,
        dest: path.join(componentDir, `${componentName}.tests.tsx`),
        vars: ctx,
      }),

      when(answers.withSsrTests, debug("Creating SSR test file")),
      when(
        answers.withSsrTests,
        template({
          source: reactTemplates.ssrTest.source,
          content: reactTemplates.ssrTest.content,
          dest: path.join(componentDir, `${componentName}.ssr.tests.tsx`),
          vars: ctx,
        }),
      ),

      when(answers.withStories, debug("Creating stories file")),
      when(
        answers.withStories,
        template({
          source: reactTemplates.stories.source,
          content: reactTemplates.stories.content,
          dest: path.join(componentDir, `${componentName}.stories.tsx`),
          vars: ctx,
        }),
      ),

      when(answers.withStyles, debug("Creating styles file")),
      when(
        answers.withStyles,
        template({
          source: reactTemplates.styles.source,
          content: reactTemplates.styles.content,
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

export default generator;
