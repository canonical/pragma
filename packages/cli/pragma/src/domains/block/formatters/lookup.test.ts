import type { URI } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import { PREFIX_MAP } from "../../shared/prefixes.js";
import type { BlockDetailed } from "../../shared/types/index.js";
import type { AspectFlags } from "../types.js";
import formatters from "./lookup.js";

const BUTTON_DETAILED: BlockDetailed = {
  uri: `${PREFIX_MAP.ds}global.component.button` as URI,
  name: "Button",
  type: "component",
  tier: "global",
  modifiers: ["importance", "density"],
  summary: "Primary action trigger with optional icon and label.",
  implementations: [
    { framework: "react", available: true },
    { framework: "svelte", available: false },
  ],
  nodeCount: 3,
  tokenCount: 1,
  whenToUse: "Use for high-priority actions in forms and flows.",
  whenNotToUse: "Avoid for low-emphasis tertiary actions.",
  guidelines: "Keep labels concise and pair icons with text when possible.",
  anatomyDsl: "root: button; children: label, icon",
  anatomyClassic: "button > label + icon",
  figmaLink: "https://figma.com/design/example/Button",
  anatomy: {
    root: {
      name: "button",
      type: "named",
      children: [
        { name: "label", type: "named", children: [] },
        { name: "icon", type: "anonymous", children: [], slot: "start" },
      ],
    },
  },
  modifierValues: [
    { family: "importance", values: ["default", "primary", "secondary"] },
    { family: "density", values: ["default", "compact"] },
  ],
  modifierFamilies: [
    {
      uri: `${PREFIX_MAP.ds}modifier_family.importance` as URI,
      name: "importance",
      values: ["default", "primary", "secondary"],
    },
  ],
  properties: [
    {
      name: "disabled",
      propertyType: "boolean",
      optional: true,
      defaultValue: "false",
      constraints: "Disables click and keyboard activation.",
    },
  ],
  subcomponents: [
    {
      uri: `${PREFIX_MAP.ds}global.subcomponent.button.icon` as URI,
      name: "Button Icon",
    },
  ],
  implementationPaths: [
    { framework: "react", path: "src/lib/Button/Button.tsx" },
  ],
  tokens: [
    {
      uri: `${PREFIX_MAP.ds}token.color.primary` as URI,
      name: "color.primary",
    },
  ],
  standards: [],
};

const ALL_ASPECTS: AspectFlags = {
  anatomy: true,
  modifiers: true,
  tokens: true,
  implementations: true,
};

describe("formatters.plain (summary)", () => {
  it("includes block name and tier", () => {
    const text = formatters.plain({
      block: BUTTON_DETAILED,
      detailed: false,
      aspects: ALL_ASPECTS,
    });
    expect(text).toContain("Button");
    expect(text).toContain("global");
  });

  it("includes summary when present", () => {
    const text = formatters.plain({
      block: BUTTON_DETAILED,
      detailed: false,
      aspects: ALL_ASPECTS,
    });
    expect(text).toContain(
      "Primary action trigger with optional icon and label.",
    );
  });

  it("includes modifier names", () => {
    const text = formatters.plain({
      block: BUTTON_DETAILED,
      detailed: false,
      aspects: ALL_ASPECTS,
    });
    expect(text).toContain("importance, density");
  });

  it("includes available implementations", () => {
    const text = formatters.plain({
      block: BUTTON_DETAILED,
      detailed: false,
      aspects: ALL_ASPECTS,
    });
    expect(text).toContain("react");
  });

  it("includes node and token counts", () => {
    const text = formatters.plain({
      block: BUTTON_DETAILED,
      detailed: false,
      aspects: ALL_ASPECTS,
    });
    expect(text).toContain("3");
    expect(text).toContain("1");
  });
});

describe("formatters.plain (detailed)", () => {
  it("includes summary counts in detailed view", () => {
    const text = formatters.plain({
      block: BUTTON_DETAILED,
      detailed: true,
      aspects: ALL_ASPECTS,
    });
    expect(text).toContain("3");
    expect(text).toContain("1");
  });

  it("shows modifiers section with values", () => {
    const text = formatters.plain({
      block: BUTTON_DETAILED,
      detailed: true,
      aspects: ALL_ASPECTS,
    });
    expect(text).toContain("Modifiers");
    expect(text).toContain("importance");
    expect(text).toContain("primary");
    expect(text).toContain("secondary");
  });

  it("shows implementations section", () => {
    const text = formatters.plain({
      block: BUTTON_DETAILED,
      detailed: true,
      aspects: ALL_ASPECTS,
    });
    expect(text).toContain("Implementations");
    expect(text).toContain("react");
    expect(text).toContain("Button.tsx");
  });

  it("shows tokens section", () => {
    const text = formatters.plain({
      block: BUTTON_DETAILED,
      detailed: true,
      aspects: ALL_ASPECTS,
    });
    expect(text).toContain("Tokens");
    expect(text).toContain("color.primary");
  });

  it("shows anatomy section", () => {
    const text = formatters.plain({
      block: BUTTON_DETAILED,
      detailed: true,
      aspects: ALL_ASPECTS,
    });
    expect(text).toContain("Anatomy");
    expect(text).toContain("button");
    expect(text).toContain("label");
    expect(text).toContain("icon");
  });

  it("shows guidance, properties, and subcomponents", () => {
    const text = formatters.plain({
      block: BUTTON_DETAILED,
      detailed: true,
      aspects: ALL_ASPECTS,
    });
    expect(text).toContain("When to use");
    expect(text).toContain("Guidelines");
    expect(text).toContain("Properties");
    expect(text).toContain("disabled");
    expect(text).toContain("Subcomponents");
    expect(text).toContain("Button Icon");
  });

  it("respects aspect filter — modifiers only", () => {
    const aspects: AspectFlags = {
      anatomy: false,
      modifiers: true,
      tokens: false,
      implementations: false,
    };
    const text = formatters.plain({
      block: BUTTON_DETAILED,
      detailed: true,
      aspects,
    });
    expect(text).toContain("Modifiers");
    // Summary field "Tokens: 1" is always shown, but the Tokens section should not appear
    expect(text).not.toContain("color.primary");
    expect(text).not.toContain("Anatomy\n");
    expect(text).not.toContain("Button.tsx");
  });
});

describe("formatters.llm", () => {
  it("formats summary as markdown", () => {
    const text = formatters.llm({
      block: BUTTON_DETAILED,
      detailed: false,
      aspects: ALL_ASPECTS,
    });
    expect(text).toContain("## Button");
    expect(text).toContain("- Tier: global");
    expect(text).toContain(
      "- Summary: Primary action trigger with optional icon and label.",
    );
    expect(text).not.toContain("### Modifiers");
  });

  it("formats detailed with all sections", () => {
    const text = formatters.llm({
      block: BUTTON_DETAILED,
      detailed: true,
      aspects: ALL_ASPECTS,
    });
    expect(text).toContain("### Modifiers");
    expect(text).toContain("### Implementations");
    expect(text).toContain("### Tokens");
    expect(text).toContain("### Anatomy");
    expect(text).toContain("### Properties");
    expect(text).toContain("### Subcomponents");
  });

  it("formats detailed with aspect filter", () => {
    const aspects: AspectFlags = {
      anatomy: false,
      modifiers: true,
      tokens: true,
      implementations: false,
    };
    const text = formatters.llm({
      block: BUTTON_DETAILED,
      detailed: true,
      aspects,
    });
    expect(text).toContain("### Modifiers");
    expect(text).toContain("### Tokens");
    expect(text).not.toContain("### Anatomy");
  });
});

describe("formatters.json", () => {
  it("returns valid JSON for summary", () => {
    const text = formatters.json({
      block: BUTTON_DETAILED,
      detailed: false,
      aspects: ALL_ASPECTS,
    });
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe("Button");
    expect(parsed.tier).toBe("global");
    expect(parsed.modifierValues).toBeUndefined();
  });

  it("returns valid JSON for detailed with all aspects", () => {
    const text = formatters.json({
      block: BUTTON_DETAILED,
      detailed: true,
      aspects: ALL_ASPECTS,
    });
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe("Button");
    expect(parsed.nodeCount).toBe(3);
    expect(parsed.tokenCount).toBe(1);
    expect(parsed.modifiers).toBeDefined();
    expect(parsed.implementations).toBeDefined();
    expect(parsed.modifierValues).toBeDefined();
    expect(parsed.tokens).toBeDefined();
    expect(parsed.anatomy).toBeDefined();
  });

  it("returns JSON with filtered aspects", () => {
    const aspects: AspectFlags = {
      anatomy: false,
      modifiers: true,
      tokens: false,
      implementations: false,
    };
    const text = formatters.json({
      block: BUTTON_DETAILED,
      detailed: true,
      aspects,
    });
    const parsed = JSON.parse(text);
    expect(parsed.modifierValues).toBeDefined();
    expect(parsed.tokens).toBeUndefined();
    expect(parsed.anatomy).toBeUndefined();
  });
});
