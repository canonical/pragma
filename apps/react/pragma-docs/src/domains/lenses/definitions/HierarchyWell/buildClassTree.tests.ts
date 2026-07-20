/**
 * The layout function's determinism contract — the React Flow SSR
 * keystone: positions are computed on the server AND the client, so the
 * same input must yield byte-equal output, every node must carry explicit
 * dimensions and handles (v12's server-rendering requirements), and the
 * layering must follow superclass depth with roots at the top.
 */

import { describe, expect, it } from "vitest";
import {
  buildClassTree,
  type ClassTreeOntology,
  NODE_HEIGHT,
  NODE_WIDTH,
  ROW_GAP,
} from "./buildClassTree.js";

/** A miniature two-ontology input mirroring the live shape (full IRIs in,
 * prefixed node ids out). Built fresh per call so byte-equality between
 * two runs can never come from shared object identity. */
const makeInput = (): ClassTreeOntology[] => [
  {
    prefix: "ds",
    namespace: "https://ds.canonical.com/",
    classes: [
      {
        uri: "https://ds.canonical.com/Component",
        label: "Component",
        isAbstract: false,
        superclass: { uri: "https://ds.canonical.com/UIBlock" },
      },
      {
        uri: "https://ds.canonical.com/UIBlock",
        label: "UI Block",
        isAbstract: true,
        superclass: { uri: "https://ds.canonical.com/Entity" },
      },
      {
        uri: "https://ds.canonical.com/Entity",
        label: "Entity",
        isAbstract: true,
        superclass: null,
      },
      {
        uri: "https://ds.canonical.com/Pattern",
        label: "Pattern",
        isAbstract: false,
        superclass: { uri: "https://ds.canonical.com/UIBlock" },
      },
    ],
  },
  {
    prefix: "cs",
    namespace: "http://pragma.canonical.com/codestandards#",
    classes: [
      {
        uri: "http://pragma.canonical.com/codestandards#CodeStandard",
        label: "Code Standard",
        isAbstract: false,
        superclass: null,
      },
    ],
  },
];

describe("buildClassTree", () => {
  it("is deterministic: same input, byte-equal output", () => {
    const first = buildClassTree(makeInput());
    const second = buildClassTree(makeInput());
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("ids nodes by PREFIXED term uri (the route address)", () => {
    const { nodes } = buildClassTree(makeInput());
    expect(nodes.map((node) => node.id).sort()).toEqual([
      "cs:CodeStandard",
      "ds:Component",
      "ds:Entity",
      "ds:Pattern",
      "ds:UIBlock",
    ]);
  });

  it("gives every node explicit dimensions and both handles (the v12 SSR contract)", () => {
    const { nodes } = buildClassTree(makeInput());
    for (const node of nodes) {
      expect(node.width).toBe(NODE_WIDTH);
      expect(node.height).toBe(NODE_HEIGHT);
      expect(node.handles?.map((handle) => handle.type).sort()).toEqual([
        "source",
        "target",
      ]);
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    }
  });

  it("layers by superclass depth, roots at the top", () => {
    const { nodes } = buildClassTree(makeInput());
    const yOf = (id: string): number => {
      const node = nodes.find((candidate) => candidate.id === id);
      if (!node) throw new Error(`no node ${id}`);
      return node.position.y;
    };
    const layer = NODE_HEIGHT + ROW_GAP;
    expect(yOf("ds:Entity")).toBe(0);
    expect(yOf("ds:UIBlock")).toBe(layer);
    expect(yOf("ds:Component")).toBe(2 * layer);
    expect(yOf("ds:Pattern")).toBe(2 * layer);
    // The second ontology starts its own root layer at the top again.
    expect(yOf("cs:CodeStandard")).toBe(0);
  });

  it("keeps ontology blocks horizontally disjoint", () => {
    const { nodes } = buildClassTree(makeInput());
    const dsMaxX = Math.max(
      ...nodes
        .filter((node) => node.id.startsWith("ds:"))
        .map((node) => node.position.x + NODE_WIDTH),
    );
    const csMinX = Math.min(
      ...nodes
        .filter((node) => node.id.startsWith("cs:"))
        .map((node) => node.position.x),
    );
    expect(csMinX).toBeGreaterThan(dsMaxX);
  });

  it("draws one subclass→superclass edge per stated superclass", () => {
    const { edges } = buildClassTree(makeInput());
    expect(
      edges.map((edge) => `${edge.source}->${edge.target}`).sort(),
    ).toEqual([
      "ds:Component->ds:UIBlock",
      "ds:Pattern->ds:UIBlock",
      "ds:UIBlock->ds:Entity",
    ]);
  });

  it("survives a superclass cycle (schema-illegal, defended) without hanging", () => {
    const cyclic: ClassTreeOntology[] = [
      {
        prefix: "x",
        namespace: "https://x.example/",
        classes: [
          {
            uri: "https://x.example/A",
            label: "A",
            isAbstract: false,
            superclass: { uri: "https://x.example/B" },
          },
          {
            uri: "https://x.example/B",
            label: "B",
            isAbstract: false,
            superclass: { uri: "https://x.example/A" },
          },
        ],
      },
    ];
    const { nodes } = buildClassTree(cyclic);
    expect(nodes).toHaveLength(2);
  });
});
