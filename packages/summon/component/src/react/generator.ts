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
import type { ReactComponentAnswers } from "./types.js";

// =============================================================================
// Template Paths & Content (loaded LAZILY on first generate())
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "..", "templates");

/** Read every React template from disk (or the embedded manifest). */
function loadReactTemplates() {
  return {
    component: loadTemplateSync(
      path.join(templatesDir, "react", "component.tsx.ejs"),
    ),
    types: loadTemplateSync(path.join(templatesDir, "react", "types.ts.ejs")),
    index: loadTemplateSync(path.join(templatesDir, "react", "index.ts.ejs")),
    test: loadTemplateSync(path.join(templatesDir, "react", "test.tsx.ejs")),
    ssrTest: loadTemplateSync(
      path.join(templatesDir, "react", "ssr.test.tsx.ejs"),
    ),
    stories: loadTemplateSync(
      path.join(templatesDir, "react", "stories.tsx.ejs"),
    ),
    styles: loadTemplateSync(
      path.join(templatesDir, "shared", "styles.css.ejs"),
    ),
  };
}

/**
 * Memoized template bundle. Loaded on the FIRST `generate()` call, never at
 * module-eval — so importing this generator (which the CLI does behind a lazy
 * boundary, and which a compiled-binary READ may still eval) never reads a
 * template. A READ never calls `generate()`, so it never touches the disk/`.ejs`
 * that a standalone binary lacks — closing the bun-code-splitting-fragility hole.
 */
let reactTemplatesCache: ReturnType<typeof loadReactTemplates> | undefined;
function reactTemplates(): ReturnType<typeof loadReactTemplates> {
  reactTemplatesCache ??= loadReactTemplates();
  return reactTemplatesCache;
}

// =============================================================================
// Generator Definition
// =============================================================================

const generator = {
  meta: {
    name: "component/react",
    displayName: `${PACKAGE_NAME}:react`,
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
    const t = reactTemplates();

    return sequence_([
      info(`Generating React component: ${componentName}`),

      debug("Creating component directory"),
      mkdir(componentDir),

      debug("Creating main component file"),
      template({
        source: t.component.source,
        content: t.component.content,
        dest: path.join(componentDir, `${componentName}.tsx`),
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
        dest: path.join(componentDir, `${componentName}.tests.tsx`),
        vars: ctx,
      }),

      when(answers.withSsrTests, debug("Creating SSR test file")),
      when(
        answers.withSsrTests,
        template({
          source: t.ssrTest.source,
          content: t.ssrTest.content,
          dest: path.join(componentDir, `${componentName}.ssr.tests.tsx`),
          vars: ctx,
        }),
      ),

      when(answers.withStories, debug("Creating stories file")),
      when(
        answers.withStories,
        template({
          source: t.stories.source,
          content: t.stories.content,
          dest: path.join(componentDir, `${componentName}.stories.tsx`),
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
} as const satisfies GeneratorDefinition<ReactComponentAnswers>;

export default generator;
