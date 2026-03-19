import type { URI } from "@canonical/ke";
import { describe, expect, it } from "vitest";
import type { ComponentSummary } from "../shared/types.js";
import {
  formatComponentList,
  formatComponentListJson,
  formatComponentListLlm,
} from "./formatComponentList.js";

const BUTTON: ComponentSummary = {
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
};

const CARD: ComponentSummary = {
  uri: "https://ds.canonical.com/card" as URI,
  name: "Card",
  tier: "global",
  modifiers: [],
  implementations: [],
  nodeCount: 0,
  tokenCount: 0,
};

const components = [BUTTON, CARD];

describe("formatComponentList (plain)", () => {
  it("includes component names", () => {
    const text = formatComponentList(components);
    expect(text).toContain("Button");
    expect(text).toContain("Card");
  });

  it("includes tier info", () => {
    const text = formatComponentList(components);
    expect(text).toContain("global");
  });

  it("includes modifiers for Button", () => {
    const text = formatComponentList(components);
    expect(text).toContain("importance");
    expect(text).toContain("density");
  });

  it("includes available implementations", () => {
    const text = formatComponentList(components);
    expect(text).toContain("react");
    // svelte is not available
    expect(text).not.toContain("svelte");
  });

  it("returns empty string for empty list", () => {
    expect(formatComponentList([])).toBe("");
  });
});

describe("formatComponentListLlm", () => {
  it("starts with heading", () => {
    const text = formatComponentListLlm(components);
    expect(text).toContain("## Components");
  });

  it("bolds component names", () => {
    const text = formatComponentListLlm(components);
    expect(text).toContain("**Button**");
    expect(text).toContain("**Card**");
  });

  it("includes tier and modifier info", () => {
    const text = formatComponentListLlm(components);
    expect(text).toContain("tier: global");
    expect(text).toContain("modifiers: importance, density");
  });

  it("includes node and token counts when non-zero", () => {
    const text = formatComponentListLlm(components);
    expect(text).toContain("nodes: 3");
    expect(text).toContain("tokens: 1");
  });
});

describe("formatComponentListJson", () => {
  it("returns valid JSON array", () => {
    const text = formatComponentListJson(components);
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });

  it("preserves component structure", () => {
    const text = formatComponentListJson(components);
    const parsed = JSON.parse(text);
    expect(parsed[0].name).toBe("Button");
    expect(parsed[0].tier).toBe("global");
    expect(parsed[0].modifiers).toEqual(["importance", "density"]);
  });

  it("returns empty array for empty list", () => {
    const text = formatComponentListJson([]);
    expect(JSON.parse(text)).toEqual([]);
  });
});
