/**
 * Shared utilities and types for component generators
 */

import * as path from "node:path";
import {
  appendFile,
  exists,
  flatMap,
  ifElseM,
  pure,
  readFile,
  type Task,
  writeFile,
} from "@canonical/summon";

// =============================================================================
// Types
// =============================================================================

export type Framework = "react" | "svelte";

/** Base answers shared across component generators */
export interface BaseComponentAnswers {
  /** Full path to the component directory (e.g., src/components/Button) */
  componentPath: string;
  /** Include CSS styles */
  withStyles: boolean;
  /** Include Storybook stories */
  withStories: boolean;
  /** Include SSR tests */
  withSsrTests: boolean;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Check if a string is in PascalCase
 */
export const isPascalCase = (str: string): boolean => {
  return /^[A-Z][a-zA-Z0-9]*$/.test(str);
};

/**
 * Validate component path
 */
export const validateComponentPath = (value: unknown): true | string => {
  if (!value || typeof value !== "string") {
    return "Component path is required";
  }
  const name = path.basename(value);
  if (!isPascalCase(name)) {
    return "Component name must be in PascalCase (e.g., MyComponent)";
  }
  return true;
};

// =============================================================================
// String Helpers
// =============================================================================

/**
 * Convert PascalCase to kebab-case
 */
export const kebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
};

/**
 * Extract component name from path
 */
export const getComponentName = (componentPath: string): string => {
  return path.basename(componentPath);
};

/**
 * Get parent directory of component
 */
export const getParentDir = (componentPath: string): string => {
  return path.dirname(componentPath);
};

// =============================================================================
// File Operations
// =============================================================================

/**
 * Append export to parent index.ts file (or create if not exists)
 */
export const appendExportToParentIndex = (
  parentDir: string,
  componentName: string,
): Task<void> => {
  const indexPath = path.join(parentDir, "index.ts");
  const exportLine = `export * from "./${componentName}";\n`;

  return ifElseM(
    exists(indexPath),
    // If exists, append (if not already exported)
    flatMap(readFile(indexPath), (content) => {
      if (content.includes(`"./${componentName}"`)) {
        return pure(undefined); // Already exported
      }
      return appendFile(indexPath, exportLine);
    }),
    // If not exists, create new file
    writeFile(indexPath, exportLine),
  );
};

// =============================================================================
// Shared Prompts
// =============================================================================

import type { PromptDefinition } from "@canonical/summon";

/**
 * Create component path prompt with framework-specific defaults
 */
export const createComponentPathPrompt = (
  framework: Framework,
): PromptDefinition => ({
  name: "componentPath",
  type: "text",
  message: "Component path:",
  default:
    framework === "react"
      ? "src/components/MyComponent"
      : "src/lib/components/MyComponent",
  validate: validateComponentPath,
  group: "Component",
});

/**
 * Shared prompts for both frameworks
 */
export const sharedPrompts: PromptDefinition[] = [
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
  {
    name: "withSsrTests",
    type: "confirm",
    message: "Include SSR tests?",
    default: true,
    group: "Options",
  },
];

// =============================================================================
// Template Context
// =============================================================================

export interface TemplateContext {
  /** Component name in PascalCase (e.g., MyComponent) */
  name: string;
  /** Component name in kebab-case (e.g., my-component) */
  kebabName: string;
  /** Generator name for comments */
  generatorName: string;
  /** Generator version */
  version: string;
  /** Include styles */
  withStyles: boolean;
  /** Include stories */
  withStories: boolean;
  /** Include SSR tests */
  withSsrTests: boolean;
  /** Index signature for compatibility with Record<string, unknown> */
  [key: string]: unknown;
}

/**
 * Create template context from answers
 */
export const createTemplateContext = (
  answers: BaseComponentAnswers,
  framework: Framework,
): TemplateContext => {
  const name = getComponentName(answers.componentPath);
  return {
    name,
    kebabName: kebabCase(name),
    generatorName: `@canonical/summon:component-${framework}`,
    version: "0.1.0",
    withStyles: answers.withStyles,
    withStories: answers.withStories,
    withSsrTests: answers.withSsrTests,
  };
};
