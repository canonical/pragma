import type { URI } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import type { ComponentDetailed } from "../shared/types.js";
import {
  formatComponentGet,
  formatComponentGetDetailed,
  formatComponentGetJson,
  formatComponentGetLlm,
} from "./formatComponentGet.js";
import type { AspectFlags } from "./resolveAspects.js";

const BUTTON_DETAILED: ComponentDetailed = {
  uri: "https://ds.canonical.com/button" as URI,
  name: "Button",
  tier: "global",
  modifiers: ["importance", "density"],
  implementations: [
    { framework: "react", available: true },
    { framework: "svelte", available: false },
  ],
  nodeCount: 3,
  tokenCount: 1,
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
  implementationPaths: [
    { framework: "react", path: "src/lib/Button/Button.tsx" },
  ],
  tokens: [
    {
      uri: "https://ds.canonical.com/token.color.primary" as URI,
      name: "color.primary",
    },
  ],
  standards: [
    {
      uri: "http://pragma.canonical.com/codestandards#react_folder" as URI,
      name: "react/component/folder-structure",
      category: "react",
    },
  ],
};

const ALL_ASPECTS: AspectFlags = {
  anatomy: true,
  modifiers: true,
  tokens: true,
  standards: true,
  implementations: true,
};

describe("formatComponentGet (summary)", () => {
  it("includes component name and tier", () => {
    const text = formatComponentGet(BUTTON_DETAILED);
    expect(text).toContain("Button");
    expect(text).toContain("global");
  });

  it("includes modifier names", () => {
    const text = formatComponentGet(BUTTON_DETAILED);
    expect(text).toContain("importance, density");
  });

  it("includes available implementations", () => {
    const text = formatComponentGet(BUTTON_DETAILED);
    expect(text).toContain("react");
  });

  it("includes node and token counts", () => {
    const text = formatComponentGet(BUTTON_DETAILED);
    expect(text).toContain("3");
    expect(text).toContain("1");
  });
});

describe("formatComponentGetDetailed", () => {
  it("shows modifiers section with values", () => {
    const text = formatComponentGetDetailed(BUTTON_DETAILED, ALL_ASPECTS);
    expect(text).toContain("Modifiers");
    expect(text).toContain("importance");
    expect(text).toContain("primary");
    expect(text).toContain("secondary");
  });

  it("shows implementations section", () => {
    const text = formatComponentGetDetailed(BUTTON_DETAILED, ALL_ASPECTS);
    expect(text).toContain("Implementations");
    expect(text).toContain("react");
    expect(text).toContain("Button.tsx");
  });

  it("shows tokens section", () => {
    const text = formatComponentGetDetailed(BUTTON_DETAILED, ALL_ASPECTS);
    expect(text).toContain("Tokens");
    expect(text).toContain("color.primary");
  });

  it("shows standards section", () => {
    const text = formatComponentGetDetailed(BUTTON_DETAILED, ALL_ASPECTS);
    expect(text).toContain("Standards");
    expect(text).toContain("react/component/folder-structure");
  });

  it("shows anatomy section", () => {
    const text = formatComponentGetDetailed(BUTTON_DETAILED, ALL_ASPECTS);
    expect(text).toContain("Anatomy");
    expect(text).toContain("button");
    expect(text).toContain("label");
    expect(text).toContain("icon");
  });

  it("respects aspect filter — modifiers only", () => {
    const aspects: AspectFlags = {
      anatomy: false,
      modifiers: true,
      tokens: false,
      standards: false,
      implementations: false,
    };
    const text = formatComponentGetDetailed(BUTTON_DETAILED, aspects);
    expect(text).toContain("Modifiers");
    expect(text).not.toContain("Tokens");
    expect(text).not.toContain("Anatomy");
    expect(text).not.toContain("Standards");
    expect(text).not.toContain("Implementations");
  });
});

describe("formatComponentGetLlm", () => {
  it("formats summary as markdown", () => {
    const text = formatComponentGetLlm(BUTTON_DETAILED, false, ALL_ASPECTS);
    expect(text).toContain("## Button");
    expect(text).toContain("- Tier: global");
    expect(text).not.toContain("### Modifiers");
  });

  it("formats detailed with all sections", () => {
    const text = formatComponentGetLlm(BUTTON_DETAILED, true, ALL_ASPECTS);
    expect(text).toContain("### Modifiers");
    expect(text).toContain("### Implementations");
    expect(text).toContain("### Tokens");
    expect(text).toContain("### Standards");
    expect(text).toContain("### Anatomy");
  });

  it("formats detailed with aspect filter", () => {
    const aspects: AspectFlags = {
      anatomy: false,
      modifiers: true,
      tokens: true,
      standards: false,
      implementations: false,
    };
    const text = formatComponentGetLlm(BUTTON_DETAILED, true, aspects);
    expect(text).toContain("### Modifiers");
    expect(text).toContain("### Tokens");
    expect(text).not.toContain("### Anatomy");
    expect(text).not.toContain("### Standards");
  });
});

describe("formatComponentGetJson", () => {
  it("returns valid JSON for summary", () => {
    const text = formatComponentGetJson(BUTTON_DETAILED, false, ALL_ASPECTS);
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe("Button");
    expect(parsed.tier).toBe("global");
    expect(parsed.modifierValues).toBeUndefined();
  });

  it("returns valid JSON for detailed with all aspects", () => {
    const text = formatComponentGetJson(BUTTON_DETAILED, true, ALL_ASPECTS);
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe("Button");
    expect(parsed.modifierValues).toBeDefined();
    expect(parsed.tokens).toBeDefined();
    expect(parsed.anatomy).toBeDefined();
  });

  it("returns JSON with filtered aspects", () => {
    const aspects: AspectFlags = {
      anatomy: false,
      modifiers: true,
      tokens: false,
      standards: false,
      implementations: false,
    };
    const text = formatComponentGetJson(BUTTON_DETAILED, true, aspects);
    const parsed = JSON.parse(text);
    expect(parsed.modifierValues).toBeDefined();
    expect(parsed.tokens).toBeUndefined();
    expect(parsed.anatomy).toBeUndefined();
  });
});
