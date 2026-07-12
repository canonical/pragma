import { describe, expect, it } from "vitest";
import buildResourceList from "./buildResourceList.js";
import { ABOX_PER_CLASS_LIMIT } from "./constants.js";
import type { GraphEntity, GraphIndex } from "./types.js";

const gadgetClass: GraphEntity = {
  uri: "https://ds.canonical.com/Gadget",
  prefixed: "ds:Gadget",
  box: "tbox",
  category: "class",
  types: ["owl:Class"],
  primaryType: null,
  primaryTypeLabel: null,
  label: "Gadget",
  description: null,
};

const nameProperty: GraphEntity = {
  uri: "https://ds.canonical.com/name",
  prefixed: "ds:name",
  box: "tbox",
  category: "property",
  types: ["owl:DatatypeProperty"],
  primaryType: null,
  primaryTypeLabel: null,
  label: null,
  description: null,
};

function makeIndividual(n: number): GraphEntity {
  return {
    uri: `https://ds.canonical.com/w${n}`,
    prefixed: `ds:w${n}`,
    box: "abox",
    category: "individual",
    types: ["ds:Gadget"],
    primaryType: "ds:Gadget",
    primaryTypeLabel: "Gadget",
    label: `Widget ${n}`,
    description: null,
  };
}

function makeIndex(entities: GraphEntity[]): GraphIndex {
  return { entities, labelByUri: new Map(), instanceCountByType: new Map() };
}

function boxOf(resource: { _meta: Record<string, unknown> }): unknown {
  return resource._meta["pragma/box"];
}

describe("buildResourceList", () => {
  it("orders all TBox schema before any ABox individual", () => {
    const index = makeIndex([makeIndividual(0), nameProperty, gadgetClass]);
    const boxes = buildResourceList(index).resources.map(boxOf);
    expect(boxes.slice(0, 2)).toEqual(["tbox", "tbox"]);
    expect(boxes.at(-1)).toBe("abox");
  });

  it("caps individuals per class and records the dropped remainder", () => {
    const overflow = ABOX_PER_CLASS_LIMIT + 7;
    const individuals = Array.from({ length: overflow }, (_, i) =>
      makeIndividual(i),
    );
    const { resources, truncation } = buildResourceList(
      makeIndex([gadgetClass, ...individuals]),
    );

    const shown = resources.filter((r) => boxOf(r) === "abox");
    expect(shown).toHaveLength(ABOX_PER_CLASS_LIMIT);
    expect(truncation.totalDropped).toBe(7);
    expect(truncation.droppedByType.get("ds:Gadget")).toBe(7);

    const cls = resources.find((r) => r.uri === "ds:Gadget");
    expect(cls?._meta["pragma/instanceCount"]).toBe(overflow);
    expect(cls?._meta["pragma/instancesShown"]).toBe(ABOX_PER_CLASS_LIMIT);
    expect(cls?._meta["pragma/truncated"]).toBe(true);
  });

  it("reports no truncation when under the cap", () => {
    const { truncation } = buildResourceList(
      makeIndex([gadgetClass, makeIndividual(0)]),
    );
    expect(truncation.totalDropped).toBe(0);
  });

  it("assigns higher annotation priority to classes than individuals", () => {
    const { resources } = buildResourceList(
      makeIndex([gadgetClass, makeIndividual(0)]),
    );
    const cls = resources.find((r) => r.uri === "ds:Gadget");
    const individual = resources.find((r) => r.uri === "ds:w0");
    expect(cls?.annotations.priority).toBeGreaterThan(
      individual?.annotations.priority ?? 1,
    );
  });
});
