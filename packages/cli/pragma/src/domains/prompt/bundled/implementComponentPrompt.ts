import type { PromptDefinition } from "../types.js";

/**
 * Design-system prompt: implement a component to spec (D6).
 *
 * Ships with the design-system pack conceptually; bundled transitionally
 * in core (like `pack/bundled/*Pack.ts`) until the package-extraction
 * phase moves it out. The `component` argument completes from block
 * names via `completion/complete`.
 */
export const implementComponentPrompt: PromptDefinition = {
  name: "implement-component",
  description:
    "Implement a design-system component to spec. Use when building or " +
    "porting a component: hydrates its anatomy, modifiers, and token " +
    "references at full detail.",
  arguments: {
    component: {
      description: "Component name (e.g. Button)",
      required: true,
      completeFrom: { tool: "block_list", field: "name" },
    },
  },
  template: [
    "You are implementing the {{component}} component of the design system.",
    "",
    "Ground rules:",
    "1. Follow the component spec below exactly — anatomy nodes name the required DOM structure; modifier families name the public API surface.",
    "2. Look up referenced design tokens instead of hardcoding values (token_lookup).",
    "3. Check the code standards for your target framework before writing code (standard_list, or the audit-code prompt when reviewing).",
    "4. If a section below is truncated or failed to hydrate, run the named tool yourself before proceeding.",
  ].join("\n"),
  embed: [
    {
      tool: "block_lookup",
      args: { names: "{{component}}", detail: "detailed" },
      heading: "Component spec",
    },
    { resource: "pragma://state", heading: "Active scope" },
  ],
};
