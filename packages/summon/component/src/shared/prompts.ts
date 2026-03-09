/**
 * Shared prompt definitions for component generators
 */

import type { PromptDefinition } from "@canonical/summon";
import type { Framework } from "./types.js";
import { validateComponentPath } from "./validation.js";

/**
 * Create component path prompt with framework-specific defaults.
 *
 * This prompt is marked as positional, allowing users to run:
 *   summon component react src/components/Button
 * instead of:
 *   summon component react --component-path=src/components/Button
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
  positional: true,
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
