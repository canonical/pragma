import { describe, expect, it } from "vitest";
import classifyEntity from "./classifyEntity.js";

const OWL_CLASS = "http://www.w3.org/2002/07/owl#Class";
const OWL_OBJECT_PROPERTY = "http://www.w3.org/2002/07/owl#ObjectProperty";
const DS_COMPONENT = "https://ds.canonical.com/Component";

describe("classifyEntity", () => {
  it("classifies owl:Class as tbox/class", () => {
    expect(classifyEntity([OWL_CLASS])).toEqual({
      box: "tbox",
      category: "class",
    });
  });

  it("classifies a property construct as tbox/property", () => {
    expect(classifyEntity([OWL_OBJECT_PROPERTY])).toEqual({
      box: "tbox",
      category: "property",
    });
  });

  it("classifies a domain-typed subject as abox/individual", () => {
    expect(classifyEntity([DS_COMPONENT])).toEqual({
      box: "abox",
      category: "individual",
    });
  });

  it("prefers schema when a subject is punned as both class and instance", () => {
    expect(classifyEntity([DS_COMPONENT, OWL_CLASS])).toEqual({
      box: "tbox",
      category: "class",
    });
  });

  it("returns null for an untyped subject", () => {
    expect(classifyEntity([])).toBeNull();
  });
});
