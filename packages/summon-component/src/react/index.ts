/**
 * React Component Generator
 *
 * Generates a React component with TypeScript, tests, stories, and styles.
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

interface ReactComponentAnswers extends BaseComponentAnswers {}

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

export const generator: GeneratorDefinition<ReactComponentAnswers> = {
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

      // Create directory
      mkdir(componentDir),

      // Create main component file
      template({
        source: reactTemplates.component,
        dest: path.join(componentDir, `${componentName}.tsx`),
        vars: ctx,
      }),

      // Create types file
      template({
        source: reactTemplates.types,
        dest: path.join(componentDir, "types.ts"),
        vars: ctx,
      }),

      // Create index file
      template({
        source: reactTemplates.index,
        dest: path.join(componentDir, "index.ts"),
        vars: ctx,
      }),

      // Create test file
      template({
        source: reactTemplates.test,
        dest: path.join(componentDir, `${componentName}.test.tsx`),
        vars: ctx,
      }),

      // Create SSR test file (conditional)
      when(
        answers.withSsrTests,
        template({
          source: reactTemplates.ssrTest,
          dest: path.join(componentDir, `${componentName}.ssr.test.tsx`),
          vars: ctx,
        }),
      ),

      // Create stories file (conditional)
      when(
        answers.withStories,
        template({
          source: reactTemplates.stories,
          dest: path.join(componentDir, `${componentName}.stories.tsx`),
          vars: ctx,
        }),
      ),

      // Create styles file (conditional)
      when(
        answers.withStyles,
        template({
          source: reactTemplates.styles,
          dest: path.join(componentDir, "styles.css"),
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
