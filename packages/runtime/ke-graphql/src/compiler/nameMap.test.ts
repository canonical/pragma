import { describe, expect, it } from "vitest";
import {
  BidirectionalNameMap,
  camelCase,
  pluralize,
  stripVerbPrefix,
} from "./nameMap.js";

describe("pluralize (§4.4 rule 5)", () => {
  it("applies the suffix rules", () => {
    expect(pluralize("edge")).toBe("edges");
    expect(pluralize("style")).toBe("styles");
    expect(pluralize("category")).toBe("categories");
    expect(pluralize("implementationLibrary")).toBe("implementationLibraries");
    expect(pluralize("switch")).toBe("switches");
    expect(pluralize("box")).toBe("boxes");
  });

  it("leaves names already ending in s unchanged", () => {
    expect(pluralize("cases")).toBe("cases");
    expect(pluralize("donts")).toBe("donts");
    expect(pluralize("extends")).toBe("extends");
  });

  it("handles irregular plurals", () => {
    expect(pluralize("child")).toBe("children");
    expect(pluralize("person")).toBe("people");
    expect(pluralize("grandChild")).toBe("grandChildren");
  });
});

describe("stripVerbPrefix (§4.4 rule 3)", () => {
  it("strips has/is verb prefixes", () => {
    expect(stripVerbPrefix("hasEdge")).toBe("edge");
    expect(stripVerbPrefix("isDraft")).toBe("draft");
    expect(stripVerbPrefix("hasModifierFamily")).toBe("modifierFamily");
  });

  it("leaves non-verb names alone", () => {
    expect(stripVerbPrefix("name")).toBe("name");
    expect(stripVerbPrefix("history")).toBe("history"); // not "has" + Word
    expect(stripVerbPrefix("island")).toBe("island");
  });
});

describe("camelCase", () => {
  it("lowercases the first character", () => {
    expect(camelCase("Component")).toBe("component");
    expect(camelCase("ImplementationLibrary")).toBe("implementationLibrary");
  });
});

describe("BidirectionalNameMap", () => {
  it("maps both directions with first-writer-wins reverse", () => {
    const map = new BidirectionalNameMap();
    map.set("https://ds.canonical.com/Component", "Component");
    map.set("https://ds.canonical.com/name", "name");
    map.set("http://pragma.canonical.com/codestandards#name", "name");
    expect(map.toGraphQL("https://ds.canonical.com/Component")).toBe(
      "Component",
    );
    expect(map.toOWL("Component")).toBe("https://ds.canonical.com/Component");
    // first writer wins for the reverse direction
    expect(map.toOWL("name")).toBe("https://ds.canonical.com/name");
    expect([...map.entries()].length).toBe(3);
  });
});
