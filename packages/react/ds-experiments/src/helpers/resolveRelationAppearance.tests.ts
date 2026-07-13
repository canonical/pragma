import { describe, expect, it } from "vitest";
import resolveRelationAppearance from "./resolveRelationAppearance.js";

describe("resolveRelationAppearance", () => {
  it("routes the taxonomic SUBCLASS_OF to the subclass renderer", () => {
    const appearance = resolveRelationAppearance("SUBCLASS_OF");

    expect(appearance.edgeRenderer).toBe("subclass");
    expect(appearance.label).toBe("is a");
  });

  it("routes associative kinds to the relation renderer", () => {
    for (const kind of ["USES", "GOVERNS", "REFINES"]) {
      expect(resolveRelationAppearance(kind).edgeRenderer).toBe("relation");
    }
    expect(resolveRelationAppearance("USES").label).toBe("uses");
  });

  it("degrades an unknown kind to a neutral associative edge", () => {
    const appearance = resolveRelationAppearance("%future added value");

    expect(appearance.edgeRenderer).toBe("relation");
    expect(appearance.modifier).toBe("unknown");
  });
});
