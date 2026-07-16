import type { PromptDefinition } from "../types.js";

/**
 * Code-standards prompt: audit code against the loaded standards (D6).
 *
 * Ships with the code-standards pack conceptually; bundled transitionally
 * in core until the package-extraction phase moves it out. The optional
 * `category` argument narrows the hydrated standards list; omitted, it is
 * dropped from the embed call entirely.
 */
export const auditCodePrompt: PromptDefinition = {
  name: "audit-code",
  description:
    "Audit code against the loaded code standards. Use when reviewing or " +
    "refactoring: hydrates the standards catalog (optionally one " +
    "category) with pointers to full do/don't examples.",
  arguments: {
    category: {
      description:
        "Standard category to focus on (see standard_categories); omit for all",
    },
  },
  template: [
    "You are auditing code against the Canonical code standards. Category focus: {{category}}",
    "",
    "Protocol:",
    "1. Read the standards below; standard_lookup <name> returns each one's full do/don't code examples.",
    "2. Flag violations with the standard's name and the offending lines.",
    "3. Propose fixes in the standard's 'do' form — do not invent style rules the standards do not state.",
  ].join("\n"),
  embed: [
    {
      tool: "standard_list",
      args: { category: "{{category}}" },
      heading: "Standards",
    },
  ],
};
