import type { PromptDefinition } from "@canonical/summon-core";

/**
 * Shared prompts for component generators (styles, stories, SSR tests)
 */
const sharedPrompts: PromptDefinition[] = [
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

export default sharedPrompts;
