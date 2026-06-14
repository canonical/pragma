import { describe, expect, it } from "vitest";
import BidirectionalNameMap from "./BidirectionalNameMap.js";

describe("BidirectionalNameMap", () => {
  it("maps an OWL URI to a GraphQL name and back", () => {
    const map = new BidirectionalNameMap();
    map.set("http://ex.org/Component", "Component");
    expect(map.toGraphQL("http://ex.org/Component")).toBe("Component");
    expect(map.toOWL("Component")).toBe("http://ex.org/Component");
  });

  it("returns undefined for unknown URIs and names", () => {
    const map = new BidirectionalNameMap();
    expect(map.toGraphQL("http://ex.org/Missing")).toBeUndefined();
    expect(map.toOWL("Missing")).toBeUndefined();
  });

  it("keeps the first writer for the reverse direction", () => {
    const map = new BidirectionalNameMap();
    map.set("http://ex.org/a", "name");
    map.set("http://ex.org/b", "name");
    // Forward direction follows the latest write for each URI...
    expect(map.toGraphQL("http://ex.org/a")).toBe("name");
    expect(map.toGraphQL("http://ex.org/b")).toBe("name");
    // ...but the reverse keeps the first canonical OWL target.
    expect(map.toOWL("name")).toBe("http://ex.org/a");
  });

  it("iterates every OWL URI / GraphQL name pair in insertion order", () => {
    const map = new BidirectionalNameMap();
    map.set("http://ex.org/A", "A");
    map.set("http://ex.org/B", "B");
    expect([...map.entries()]).toEqual([
      ["http://ex.org/A", "A"],
      ["http://ex.org/B", "B"],
    ]);
  });
});
