import { describe, expect, it } from "vitest";
import BidirectionalNameMap from "./BidirectionalNameMap.js";
import {
  camelize,
  pluralize,
  sanitizeGraphQLName,
  sanitizePrefixComponent,
  stripVerbPrefix,
} from "./nameMap.js";

describe("pluralize", () => {
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

  it("preserves the case of a capitalized irregular", () => {
    expect(pluralize("Child")).toBe("Children");
    expect(pluralize("Person")).toBe("People");
  });
});

describe("stripVerbPrefix", () => {
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

describe("sanitizeGraphQLName", () => {
  it("replaces illegal characters and guards leading digits", () => {
    expect(sanitizeGraphQLName("My-Class")).toBe("My_Class");
    expect(sanitizeGraphQLName("has.thing")).toBe("has_thing");
    expect(sanitizeGraphQLName("3d")).toBe("_3d");
    expect(sanitizeGraphQLName("")).toBe("_");
    expect(sanitizeGraphQLName("fine_Name0")).toBe("fine_Name0");
  });

  it("collapses the introspection-reserved leading underscore run", () => {
    // "__typename" is lexically legal, so only validateSchema rejects it —
    // the sanitizer must catch it here or the compile dies at C003 with a
    // message naming neither the term nor its IRI.
    expect(sanitizeGraphQLName("__typename")).toBe("_typename");
    expect(sanitizeGraphQLName("__Foo")).toBe("_Foo");
    expect(sanitizeGraphQLName("___x")).toBe("_x");
    // A single leading underscore is legal and must survive untouched.
    expect(sanitizeGraphQLName("_meta")).toBe("_meta");
    expect(sanitizeGraphQLName("_")).toBe("_");
    // The reserved run can also be MINTED by the illegal-character pass.
    expect(sanitizeGraphQLName("--x")).toBe("_x");
  });
});

describe("sanitizePrefixComponent", () => {
  it("camel-joins segments split on GraphQL-illegal characters", () => {
    expect(sanitizePrefixComponent("ds-global")).toBe("dsGlobal");
    expect(sanitizePrefixComponent("ds.v2")).toBe("dsV2");
    expect(sanitizePrefixComponent("a-b-c")).toBe("aBC");
  });

  it("passes an already-legal prefix through unchanged", () => {
    expect(sanitizePrefixComponent("ds")).toBe("ds");
    expect(sanitizePrefixComponent("anatomy_v2")).toBe("anatomy_v2");
  });

  it("sanitizes the residue camel-joining cannot fix", () => {
    expect(sanitizePrefixComponent("3d")).toBe("_3d"); // digit-leading
    expect(sanitizePrefixComponent("---")).toBe("_"); // no legal characters
    expect(sanitizePrefixComponent("")).toBe("_"); // empty
  });
});

describe("camelize", () => {
  it("lowercases the first character", () => {
    expect(camelize("Component")).toBe("component");
    expect(camelize("ImplementationLibrary")).toBe("implementationLibrary");
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
