import { describe, expect, it } from "vitest";
import resolveEntityAppearance from "./resolveEntityAppearance.js";

describe("resolveEntityAppearance", () => {
  it("maps each known kind to its own modifier, label, and accent token", () => {
    expect(resolveEntityAppearance("COMPONENT")).toEqual({
      modifier: "component",
      label: "Component",
      accentVar: "--entity-accent-component",
    });
    expect(resolveEntityAppearance("TOKEN").accentVar).toBe(
      "--entity-accent-token",
    );
    expect(resolveEntityAppearance("STANDARD").label).toBe("Standard");
    expect(resolveEntityAppearance("CONCEPT").modifier).toBe("concept");
  });

  it("degrades an unknown kind to a neutral appearance instead of throwing", () => {
    const appearance = resolveEntityAppearance("%future added value");

    expect(appearance.modifier).toBe("unknown");
    expect(appearance.label).toBe("Entity");
    expect(appearance.accentVar).toBe("--entity-accent-unknown");
  });
});
