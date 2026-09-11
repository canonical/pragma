/**
 * The layout's three contracts: DETERMINISM (same input, byte-equal
 * output — the SSR/hydration guarantee), SEPARATION (no two boxes overlap
 * after the relaxation pass — the exhibit's collision guarantee, made
 * static), and SEMANTICS (a relation family always lands in its compass
 * sector, and an edge's arrowhead follows the predicate's true direction).
 */

import { describe, expect, it } from "vitest";
import {
  buildNeighbourhood,
  edgeEndpoint,
  estimateNodeWidth,
} from "./buildNeighbourhood.js";
import {
  COLLISION_GAP,
  NODE_MAX_WIDTH,
  NODE_MIN_WIDTH,
  RELATION_SPECS,
  type RelationSpec,
} from "./constants.js";
import type { NeighbourhoodInput } from "./types.js";

const spec = (key: RelationSpec["key"]): RelationSpec => {
  const found = RELATION_SPECS.find((candidate) => candidate.key === key);
  if (found === undefined) throw new Error(`no spec ${key}`);
  return found;
};

/** A crowded, mixed-sector exemplar: every family populated. */
const crowdedInput: NeighbourhoodInput = {
  centreUri: "ds:global.component.card",
  centreLabel: "Card",
  neighbours: [
    { uri: "ds:Component", label: "Component", spec: spec("type") },
    { uri: "ds:tier.global", label: "Global", spec: spec("tier") },
    {
      uri: "ds:global.component.tile",
      label: "Tile",
      spec: spec("inheritsFrom"),
    },
    {
      uri: "ds:global.component.card+dense",
      label: "Card+Dense",
      spec: spec("variant"),
    },
    {
      uri: "ds:global.component.card+flat",
      label: "Card+Flat",
      spec: spec("variant"),
    },
    {
      uri: "ds:global.modifier_family.importance",
      label: "Importance",
      spec: spec("modifierFamily"),
    },
    {
      uri: "ds:global.subcomponent.card-header",
      label: "Card.Header",
      spec: spec("subcomponent"),
    },
    {
      uri: "ds:global.subcomponent.card-content",
      label: "Card.Content",
      spec: spec("subcomponent"),
    },
    {
      uri: "ds:global.subcomponent.card-footer",
      label: "Card.Footer",
      spec: spec("subcomponent"),
    },
    {
      uri: "ds:global.subcomponent.card-image",
      label: "Card.Image",
      spec: spec("subcomponent"),
    },
    {
      uri: "ds:global.subcomponent.card-thumbnail",
      label: "Card.Thumbnail",
      spec: spec("subcomponent"),
    },
  ],
};

/** The final x/y pair of an SVG path's `d` string. */
const pathEnd = (d: string): { x: number; y: number } => {
  const numbers = d.split(/[^-\d.]+/).filter((token) => token.length > 0);
  const x = Number(numbers.at(-2));
  const y = Number(numbers.at(-1));
  return { x, y };
};

describe("estimateNodeWidth", () => {
  it("grows with the label and clamps at both bounds", () => {
    expect(estimateNodeWidth("A", false)).toBeLessThan(
      estimateNodeWidth("A much longer label", false),
    );
    expect(estimateNodeWidth("", false)).toBeGreaterThanOrEqual(NODE_MIN_WIDTH);
    expect(estimateNodeWidth("x".repeat(200), false)).toBeLessThanOrEqual(
      NODE_MAX_WIDTH,
    );
  });
});

describe("edgeEndpoint", () => {
  it("meets the box border along the segment, never inside it", () => {
    const node = {
      uri: "a",
      label: "a",
      kind: "component",
      box: "instance",
      isCentre: false,
      x: 0,
      y: 0,
      width: 100,
      height: 30,
    } as const;
    const point = edgeEndpoint(node, { x: 200, y: 0 }, 0);
    expect(point.x).toBe(50);
    expect(point.y).toBe(0);
  });
});

describe("buildNeighbourhood", () => {
  it("is deterministic: same input, deep-equal output", () => {
    expect(buildNeighbourhood(crowdedInput)).toEqual(
      buildNeighbourhood(crowdedInput),
    );
  });

  it("keeps every settled coordinate finite and inside the canvas", () => {
    const graph = buildNeighbourhood(crowdedInput);
    for (const node of graph.nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(node.x - node.width / 2).toBeGreaterThanOrEqual(0);
      expect(node.y - node.height / 2).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width / 2).toBeLessThanOrEqual(graph.width);
      expect(node.y + node.height / 2).toBeLessThanOrEqual(graph.height);
    }
  });

  it("separates every pair of boxes (the collision guarantee)", () => {
    const graph = buildNeighbourhood(crowdedInput);
    for (let a = 0; a < graph.nodes.length; a += 1) {
      for (let b = a + 1; b < graph.nodes.length; b += 1) {
        const nodeA = graph.nodes.at(a);
        const nodeB = graph.nodes.at(b);
        if (nodeA === undefined || nodeB === undefined) continue;
        const overlapX =
          (nodeA.width + nodeB.width) / 2 - Math.abs(nodeA.x - nodeB.x);
        const overlapY =
          (nodeA.height + nodeB.height) / 2 - Math.abs(nodeA.y - nodeB.y);
        // Separated on at least one axis, with a little daylight.
        expect(Math.min(overlapX, overlapY)).toBeLessThanOrEqual(COLLISION_GAP);
      }
    }
  });

  it("keeps each family on its compass side of the subject", () => {
    const graph = buildNeighbourhood(crowdedInput);
    const centre = graph.nodes.find((node) => node.isCentre);
    if (centre === undefined) throw new Error("no centre");
    for (const node of graph.nodes) {
      if (node.isCentre) continue;
      if (node.sector === "taxonomy") expect(node.y).toBeLessThan(centre.y);
      if (node.sector === "composition")
        expect(node.y).toBeGreaterThan(centre.y);
      if (node.sector === "variants") expect(node.x).toBeGreaterThan(centre.x);
      if (node.sector === "modifiers") expect(node.x).toBeLessThan(centre.x);
    }
  });

  it("draws structural edges straight and semantic edges as labelled arcs", () => {
    const graph = buildNeighbourhood(crowdedInput);
    const structural = graph.edges.filter(
      (edge) => edge.family === "structural",
    );
    const semantic = graph.edges.filter((edge) => edge.family === "semantic");
    expect(structural.length).toBeGreaterThan(0);
    expect(semantic.length).toBeGreaterThan(0);
    for (const edge of structural) {
      expect(edge.d).toContain(" L ");
      expect(edge.labelAt).toBeUndefined();
    }
    for (const edge of semantic) {
      expect(edge.d).toContain(" Q ");
      expect(edge.labelAt).toBeDefined();
      expect(edge.predicate.length).toBeGreaterThan(0);
    }
  });

  it("points the arrowhead along the predicate's true direction", () => {
    const graph = buildNeighbourhood(crowdedInput);
    const centre = graph.nodes.find((node) => node.isCentre);
    const variantNode = graph.nodes.find((node) =>
      node.uri.endsWith("card+dense"),
    );
    const variantEdge = graph.edges.find((edge) =>
      edge.neighbourUri.endsWith("card+dense"),
    );
    if (
      centre === undefined ||
      variantNode === undefined ||
      variantEdge === undefined
    ) {
      throw new Error("variant fixtures missing");
    }
    // `variant` is an INCOMING predicate (variant → base): the path must
    // END nearer the subject than the neighbour.
    const end = pathEnd(variantEdge.d);
    const toCentre = Math.hypot(end.x - centre.x, end.y - centre.y);
    const toNeighbour = Math.hypot(
      end.x - variantNode.x,
      end.y - variantNode.y,
    );
    expect(toCentre).toBeLessThan(toNeighbour);
  });

  it("renders a lone subject as a graph of one node and no edges", () => {
    const graph = buildNeighbourhood({
      centreUri: "ds:global.component.button",
      centreLabel: "Button",
      neighbours: [],
    });
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(0);
  });
});
