/**
 * Shared types for component generators
 */

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
