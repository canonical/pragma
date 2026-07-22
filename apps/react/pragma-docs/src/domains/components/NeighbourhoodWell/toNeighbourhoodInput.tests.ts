/**
 * The extraction's policy contracts: linkable relations get real homes,
 * everything else stays inert; one entity is one node however many
 * relations name it; capped connections surface as `truncated`; and the
 * class term derives from data, never a namespace table.
 */

import { describe, expect, it } from "vitest";
import type { NeighbourhoodWell_component$data } from "#relay/__generated__/NeighbourhoodWell_component.graphql.js";
import {
  deriveClassTerm,
  toNeighbourhoodInput,
} from "./toNeighbourhoodInput.js";

const emptyConnection = {
  edges: [],
  pageInfo: { hasNextPage: false },
} as const;

const connectionOf = (uris: readonly string[], hasNextPage = false) => ({
  edges: uris.map((uri) => ({ node: { uri, name: uri.split(".").at(-1) } })),
  pageInfo: { hasNextPage },
});

/** A hand-built fragment payload (the generated type, structurally). */
const payload = (
  overrides: Partial<NeighbourhoodWell_component$data>,
): NeighbourhoodWell_component$data =>
  ({
    uri: "ds:global.component.card",
    name: "Card",
    _meta: {
      type: {
        uri: "https://ds.canonical.com/Component",
        label: "Component",
        namespace: "ds",
      },
    },
    tier: { uri: "ds:tier.global", name: "Global" },
    subcomponents: emptyConnection,
    variants: emptyConnection,
    variantOfs: emptyConnection,
    inheritsFroms: emptyConnection,
    specializedBies: emptyConnection,
    modifierFamilies: emptyConnection,
    ...overrides,
  }) as NeighbourhoodWell_component$data;

describe("deriveClassTerm", () => {
  it("joins the graph's prefix to the class IRI's local name", () => {
    expect(deriveClassTerm("https://ds.canonical.com/Component", "ds")).toBe(
      "ds:Component",
    );
    expect(deriveClassTerm("https://example.org/onto#Widget", "ex")).toBe(
      "ex:Widget",
    );
  });

  it("passes an already-compact form through and refuses bare names", () => {
    expect(deriveClassTerm("ds:Component", "ds")).toBe("ds:Component");
    expect(deriveClassTerm("Component", "ds")).toBeUndefined();
    expect(
      deriveClassTerm("https://ds.canonical.com/Component", ""),
    ).toBeUndefined();
  });
});

describe("toNeighbourhoodInput", () => {
  it("links the linkable, keeps the rest inert, and addresses the class in Definitions", () => {
    const { input } = toNeighbourhoodInput(
      payload({
        variants: connectionOf(["ds:global.component.card+dense"]),
      }),
    );
    const byUri = new Map(
      input.neighbours.map((neighbour) => [neighbour.uri, neighbour]),
    );
    expect(byUri.get("ds:Component")?.href).toBe("/definitions/ds%3AComponent");
    expect(byUri.get("ds:global.component.card+dense")?.href).toBe(
      "/components/ds%3Aglobal.component.card%2Bdense",
    );
    expect(byUri.get("ds:tier.global")?.href).toBeUndefined();
  });

  it("keeps one node per entity however many relations name it", () => {
    const { input } = toNeighbourhoodInput(
      payload({
        variants: connectionOf(["ds:global.component.twin"]),
        subcomponents: connectionOf(["ds:global.component.twin"]),
      }),
    );
    expect(
      input.neighbours.filter(
        (neighbour) => neighbour.uri === "ds:global.component.twin",
      ),
    ).toHaveLength(1);
  });

  it("never renders the subject as its own neighbour", () => {
    const { input } = toNeighbourhoodInput(
      payload({
        variantOfs: connectionOf(["ds:global.component.card"]),
      }),
    );
    expect(
      input.neighbours.some(
        (neighbour) => neighbour.uri === "ds:global.component.card",
      ),
    ).toBe(false);
  });

  it("surfaces capped connections as truncated predicates (the partial state)", () => {
    const { truncated } = toNeighbourhoodInput(
      payload({
        subcomponents: connectionOf(
          ["ds:global.subcomponent.card-header"],
          true,
        ),
      }),
    );
    expect(truncated).toEqual(["subcomponent"]);
  });

  it("keeps an underivable class node, inert", () => {
    const { input } = toNeighbourhoodInput(
      payload({
        _meta: {
          type: {
            uri: "https://elsewhere.example/Component",
            label: "Component",
            namespace: "",
          },
        },
      }),
    );
    const classNode = input.neighbours.find(
      (neighbour) => neighbour.spec.key === "type",
    );
    expect(classNode).toBeDefined();
    expect(classNode?.href).toBeUndefined();
  });
});
