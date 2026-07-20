/**
 * The well's presentation projection — and above all THE SSR DETERMINISM
 * PROOF: the client's neutral first render (no hover, no focus, the no-op
 * filter) must produce byte-identical output to the server's
 * selection-only render, or hydration diverges.
 *
 * Also pins the exhibit's heuristics as executable claims: the ego-fade is
 * ONE hop and never transitive, edges survive only with both endpoints,
 * and filtering never touches a position.
 */

import { describe, expect, it } from "vitest";
import { allNamespacesFilter, type LensFilter } from "../lensFilter.js";
import { buildClassTree, type ClassTreeOntology } from "./buildClassTree.js";
import {
  decorateForSelection,
  decorateForView,
  EDGE_FADED_CLASS,
  egoNeighbourhood,
  HIDDEN_CLASS,
  NODE_FADED_CLASS,
  NODE_SELECTED_CLASS,
} from "./decorateGraph.js";

/** A small chain plus a sibling: Entity ← UIBlock ← {Component, Pattern},
 * and a second ontology, so one-hop-vs-transitive is observable. */
const makeInput = (): ClassTreeOntology[] => [
  {
    prefix: "ds",
    namespace: "https://ds.canonical.com/",
    classes: [
      {
        uri: "https://ds.canonical.com/Entity",
        label: "Entity",
        isAbstract: true,
        superclass: null,
      },
      {
        uri: "https://ds.canonical.com/UIBlock",
        label: "UI Block",
        isAbstract: true,
        superclass: { uri: "https://ds.canonical.com/Entity" },
      },
      {
        uri: "https://ds.canonical.com/Component",
        label: "Component",
        isAbstract: false,
        superclass: { uri: "https://ds.canonical.com/UIBlock" },
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

const graph = () => buildClassTree(makeInput());
const ALL_PREFIXES = ["ds", "cs"];
const noOpFilter: LensFilter = allNamespacesFilter(ALL_PREFIXES);

const classOf = (
  result: { readonly nodes: readonly { id: string; className?: string }[] },
  id: string,
): string | undefined => result.nodes.find((node) => node.id === id)?.className;

describe("THE SSR DETERMINISM RULE", () => {
  it("the neutral client render equals the server's selection-only render, byte for byte", () => {
    // This is the whole hydration argument in one assertion. The server
    // may only know the URL; the client's FIRST render additionally holds
    // hover (empty) and the filter (the no-op seed). If those are truly
    // no-ops, the two serialise identically.
    const server = decorateForSelection(graph(), "ds:UIBlock");
    const clientFirstPaint = decorateForView(graph(), {
      selected: "ds:UIBlock",
      focused: undefined,
      filter: noOpFilter,
    });
    expect(JSON.stringify(clientFirstPaint)).toBe(JSON.stringify(server));
  });

  it("holds with NO selection too (the /definitions address)", () => {
    const server = decorateForSelection(graph(), undefined);
    const clientFirstPaint = decorateForView(graph(), {
      selected: undefined,
      focused: undefined,
      filter: noOpFilter,
    });
    expect(JSON.stringify(clientFirstPaint)).toBe(JSON.stringify(server));
  });

  it("the proof has teeth: a NON-neutral first paint does NOT match", () => {
    // Guards the test above from passing vacuously. If hover state leaked
    // into the first render, hydration would break — and this proves the
    // comparison above is capable of noticing.
    const server = decorateForSelection(graph(), "ds:UIBlock");
    const leaked = decorateForView(graph(), {
      selected: "ds:UIBlock",
      focused: "ds:Component",
      filter: noOpFilter,
    });
    expect(JSON.stringify(leaked)).not.toBe(JSON.stringify(server));
  });

  it("is pure: the same inputs give byte-equal output across calls", () => {
    const once = decorateForView(graph(), {
      selected: "ds:UIBlock",
      filter: noOpFilter,
    });
    const twice = decorateForView(graph(), {
      selected: "ds:UIBlock",
      filter: noOpFilter,
    });
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });
});

describe("selection (server-rendered, URL-derived)", () => {
  it("marks the selected node and fades its non-neighbours", () => {
    const result = decorateForSelection(graph(), "ds:UIBlock");
    expect(classOf(result, "ds:UIBlock")).toContain(NODE_SELECTED_CLASS);
    // One hop from UIBlock: Entity (up), Component and Pattern (down).
    expect(classOf(result, "ds:Entity")).toBeUndefined();
    expect(classOf(result, "ds:Component")).toBeUndefined();
    expect(classOf(result, "ds:Pattern")).toBeUndefined();
    // A different ontology's root is not a neighbour — it fades.
    expect(classOf(result, "cs:CodeStandard")).toContain(NODE_FADED_CLASS);
  });

  it("fades nothing when no term is selected", () => {
    const result = decorateForSelection(graph(), undefined);
    for (const node of result.nodes) {
      expect(node.className).toBeUndefined();
    }
  });
});

describe("the ego-fade is ONE hop, never transitive", () => {
  it("excludes a node two hops away", () => {
    // Component → UIBlock → Entity. Selecting Component must NOT spare
    // Entity: the exhibit's fade is a neighbourhood, not a reachability
    // set, and this is the assertion that keeps it that way.
    const result = decorateForSelection(graph(), "ds:Component");
    expect(classOf(result, "ds:UIBlock")).toBeUndefined();
    expect(classOf(result, "ds:Entity")).toContain(NODE_FADED_CLASS);
    // A sibling is two hops away too (via the shared parent).
    expect(classOf(result, "ds:Pattern")).toContain(NODE_FADED_CLASS);
  });

  it("egoNeighbourhood returns the centre plus its direct partners only", () => {
    const { edges } = graph();
    expect([...egoNeighbourhood(edges, "ds:UIBlock")].sort()).toEqual([
      "ds:Component",
      "ds:Entity",
      "ds:Pattern",
      "ds:UIBlock",
    ]);
  });

  it("is empty without a centre", () => {
    expect(egoNeighbourhood(graph().edges, undefined).size).toBe(0);
  });

  it("fades every edge not incident to the centre — and spares those that are", () => {
    const result = decorateForSelection(graph(), "ds:Component");
    const incident = result.edges.find(
      (edge) => edge.source === "ds:Component",
    );
    const distant = result.edges.find((edge) => edge.source === "ds:UIBlock");
    expect(incident?.className).toBeUndefined();
    expect(distant?.className).toContain(EDGE_FADED_CLASS);
  });
});

describe("hover/focus overrides selection transiently", () => {
  it("re-centres the fade on the focused node while keeping the selection styled", () => {
    const result = decorateForView(graph(), {
      selected: "ds:UIBlock",
      focused: "cs:CodeStandard",
      filter: noOpFilter,
    });
    // The selection KEEPS its marker — leaving the pointer must not lose
    // where you are…
    expect(classOf(result, "ds:UIBlock")).toContain(NODE_SELECTED_CLASS);
    // …but the fade now centres on what is hovered, so UIBlock (not a
    // neighbour of CodeStandard) is dimmed even though it is selected.
    expect(classOf(result, "ds:UIBlock")).toContain(NODE_FADED_CLASS);
    expect(classOf(result, "cs:CodeStandard")).toBeUndefined();
  });

  it("clearing the focus restores the selection's own fade", () => {
    const hovered = decorateForView(graph(), {
      selected: "ds:UIBlock",
      focused: "cs:CodeStandard",
      filter: noOpFilter,
    });
    const cleared = decorateForView(graph(), {
      selected: "ds:UIBlock",
      focused: undefined,
      filter: noOpFilter,
    });
    expect(JSON.stringify(cleared)).not.toBe(JSON.stringify(hovered));
    expect(JSON.stringify(cleared)).toBe(
      JSON.stringify(decorateForSelection(graph(), "ds:UIBlock")),
    );
  });
});

describe("filtering HIDES in the graph (the asymmetry's other half)", () => {
  const dsOnly: LensFilter = allNamespacesFilter(["ds"]);

  it("hides a class whose namespace chip is off", () => {
    const result = decorateForView(graph(), {
      selected: undefined,
      filter: dsOnly,
    });
    expect(classOf(result, "cs:CodeStandard")).toContain(HIDDEN_CLASS);
    expect(classOf(result, "ds:Component")).toBeUndefined();
  });

  it("hides a class whose abstraction chip is off", () => {
    const result = decorateForView(graph(), {
      selected: undefined,
      filter: { ...noOpFilter, abstractions: ["concrete"] },
    });
    expect(classOf(result, "ds:UIBlock")).toContain(HIDDEN_CLASS);
    expect(classOf(result, "ds:Entity")).toContain(HIDDEN_CLASS);
    expect(classOf(result, "ds:Component")).toBeUndefined();
  });

  it("drops an edge that loses EITHER endpoint (the exhibit's rule)", () => {
    const result = decorateForView(graph(), {
      selected: undefined,
      filter: { ...noOpFilter, abstractions: ["concrete"] },
    });
    // Component→UIBlock: the child survives, the parent does not, so the
    // edge goes. An edge to nowhere is worse than no edge.
    const orphaned = result.edges.find(
      (edge) => edge.source === "ds:Component",
    );
    expect(orphaned?.className).toContain(HIDDEN_CLASS);
  });

  it("NEVER moves a node — filtering changes class names, not geometry", () => {
    // The one habit we deliberately do not copy from the exhibit, which
    // re-runs its force simulation on every lens change.
    const before = decorateForView(graph(), {
      selected: undefined,
      filter: noOpFilter,
    });
    const after = decorateForView(graph(), {
      selected: undefined,
      filter: { ...noOpFilter, abstractions: ["concrete"] },
    });
    expect(after.nodes.map((node) => node.position)).toEqual(
      before.nodes.map((node) => node.position),
    );
    expect(after.nodes.map((node) => node.id)).toEqual(
      before.nodes.map((node) => node.id),
    );
  });

  it("a hidden node's neighbourhood does not privilege anything", () => {
    // Selecting a term, then filtering it out: the fade would otherwise
    // spotlight the neighbours of something invisible.
    const result = decorateForView(graph(), {
      selected: "ds:UIBlock",
      filter: { ...noOpFilter, abstractions: ["concrete"] },
    });
    expect(classOf(result, "ds:Component")).toBeUndefined();
    expect(classOf(result, "cs:CodeStandard")).toBeUndefined();
  });
});
