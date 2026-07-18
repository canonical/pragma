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
 * summon component lit --component-path=src/lib/components/Button
 * summon component lit --component-path=src/lib/components/Card --with-styles --with-stories
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
} from "../shared/index.js";
import { loadTemplateSync } from "../shared/loadTemplate.js";
import type { LitAnswers } from "./types.js";

// =============================================================================
// Template Paths & Content (loaded LAZILY on first generate())
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "..", "templates");

/** Read every Lit template from disk (or the embedded manifest). */
function loadLitTemplates() {
  return {
    component: loadTemplateSync(
      path.join(templatesDir, "lit", "component.ts.ejs"),
    ),
    index: loadTemplateSync(path.join(templatesDir, "lit", "index.ts.ejs")),
    types: loadTemplateSync(path.join(templatesDir, "lit", "types.ts.ejs")),
    tests: loadTemplateSync(path.join(templatesDir, "lit", "tests.ts.ejs")),
    stories: loadTemplateSync(path.join(templatesDir, "lit", "stories.ts.ejs")),
    styles: loadTemplateSync(path.join(templatesDir, "lit", "styles.css.ejs")),
  };
}

/**
 * Memoized template bundle. Loaded on the FIRST `generate()` call, never at
 * module-eval — so importing this generator never reads a template, and a READ
 * command (which never calls `generate()`) never touches the `.ejs` a compiled
 * binary lacks. See the react generator for the full rationale.
 */
let litTemplatesCache: ReturnType<typeof loadLitTemplates> | undefined;
function litTemplates(): ReturnType<typeof loadLitTemplates> {
  litTemplatesCache ??= loadLitTemplates();
  return litTemplatesCache;
}

// =============================================================================
// Custom Prompts (without SSR tests)
// =============================================================================

const litPrompts = [
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
 * @see {@link https://summon.dev/generators/component/lit} for documentation
 */
const generator = {
  meta: {
    name: "component/lit",
    displayName: `${PACKAGE_NAME}:lit`,
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
      "summon component lit --component-path=src/lib/components/Button",
      "summon component lit --component-path=src/lib/components/Card --with-styles --with-stories",
      "summon component lit --component-path=src/lib/components/Modal --no-with-styles",
      "summon component lit --component-path=src/lib/components/Button --dry-run",
    ],
  },

  prompts: [createComponentPathPrompt("lit"), ...litPrompts],

  generate: (answers) => {
    const componentName = getComponentName(answers.componentPath);
    const componentDir = answers.componentPath;
    const parentDir = getParentDir(answers.componentPath);
    const ctx = createTemplateContext(answers, "lit");
    const t = litTemplates();

    return sequence_([
      info(`Generating Lit web component: ${componentName}`),

      debug("Creating component directory"),
      mkdir(componentDir),

      debug("Creating main component file"),
      template({
        source: t.component.source,
        content: t.component.content,
        dest: path.join(componentDir, `${componentName}.ts`),
        vars: ctx,
      }),

      debug("Creating index barrel file"),
      template({
        source: t.index.source,
        content: t.index.content,
        dest: path.join(componentDir, "index.ts"),
        vars: ctx,
      }),

      debug("Creating types file"),
      template({
        source: t.types.source,
        content: t.types.content,
        dest: path.join(componentDir, "types.ts"),
        vars: ctx,
      }),

      debug("Creating test file"),
      template({
        source: t.tests.source,
        content: t.tests.content,
        dest: path.join(componentDir, `${componentName}.tests.ts`),
        vars: ctx,
      }),

      when(answers.withStories, debug("Creating stories file")),
      when(
        answers.withStories,
        template({
          source: t.stories.source,
          content: t.stories.content,
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
} as const satisfies GeneratorDefinition<LitAnswers>;

export default generator;
