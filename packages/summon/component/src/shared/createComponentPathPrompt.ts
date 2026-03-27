import type { PromptDefinition } from "@canonical/summon-core";
import type { Framework } from "./types.js";
import validateComponentPath from "./validateComponentPath.js";

/**
 * Create component path prompt with framework-specific defaults.
 *
 * This prompt is marked as positional, allowing users to run:
 *   summon component react src/components/Button
 * instead of:
 *   summon component react --component-path=src/components/Button
 */
export default function createComponentPathPrompt(
  framework: Framework,
): PromptDefinition {
  return {
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
  };
}
