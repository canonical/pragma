import { describe, expect, it } from "vitest";
import type { GraphEntity, GraphRelation } from "../graph/types.js";
import buildGraphElements from "./buildGraphElements.js";

const entities: GraphEntity[] = [
  { id: "x", label: "X", kind: "COMPONENT" },
  { id: "y", label: "Y", kind: "CONCEPT" },
];

const relations: GraphRelation[] = [
  { id: "e1", source: "x", target: "y", kind: "SUBCLASS_OF" },
  { id: "e2", source: "x", target: "y", kind: "USES", label: "depends on" },
];

describe("buildGraphElements", () => {
  it("turns each entity into an entity node carrying its data", () => {
    const { nodes } = buildGraphElements(entities, relations);

    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({ id: "x", type: "entity" });
    expect(nodes[0].data.entity.label).toBe("X");
  });

  it("routes edges to the right renderer by relation kind", () => {
    const { edges } = buildGraphElements(entities, relations);

    expect(edges[0].type).toBe("subclass");
    expect(edges[1].type).toBe("relation");
  });

  it("prefers an explicit relation label over the kind verb", () => {
    const { edges } = buildGraphElements(entities, relations);

    // SUBCLASS_OF has no explicit label -> falls back to the verb.
    expect(edges[0].label).toBe("is a");
    // USES carries one -> it wins.
    expect(edges[1].label).toBe("depends on");
  });

  it("honours curated positions over the computed layout", () => {
    const positions = new Map([["x", { x: 42, y: 7 }]]);
    const { nodes } = buildGraphElements(entities, relations, { positions });

    expect(nodes.find((node) => node.id === "x")?.position).toEqual({
      x: 42,
      y: 7,
    });
  });
});
