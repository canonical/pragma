/**
 * SSR posture — the bespoke renderer's server-rendering proof at the
 * component level: the well's full node DOM AND its edge paths render to
 * a string, because the deterministic layout settles every coordinate
 * with no browser API anywhere. Any regression to client-only rendering
 * (an empty well server-side) fails loudly here.
 *
 * Counts are DERIVED FROM THE FIXTURE (class records, superclass refs),
 * never hardcoded: the captured store is the one source of truth for how
 * many nodes and structural edges the live graph carries, so a recapture
 * can grow the ontology corpus without rewriting these assertions.
 */

import { renderToString } from "react-dom/server";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import definitionsExplorerRecords from "../__fixtures__/definitionsExplorerRecords.js";
import {
  definitionsPageAt,
  UIBLOCK_TERM,
} from "../__fixtures__/definitionsPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/** The fixture's own class-LIST records — the expected node population,
 * resolved through each Ontology record's `classes` refs (the graph draws
 * exactly those; lookalike OntologyClass records also ride the store from
 * property `domain` refs and the inspector's term lookup). */
const recordMap = definitionsExplorerRecords as Record<
  string,
  {
    __typename?: string;
    classes?: { __refs?: readonly string[] };
    superclass?: unknown;
  }
>;
const fixtureClassRecords = Object.values(recordMap)
  .filter((record) => record.__typename === "Ontology")
  .flatMap((record) => record.classes?.__refs ?? [])
  .map((ref) => recordMap[ref])
  .filter((record) => record !== undefined);

/** Classes whose record names a superclass — the structural edge count.
 * (A subclass edge draws only when the parent is in the same ontology's
 * list, which holds for every captured record.) */
const fixtureSubclassCount = fixtureClassRecords.filter(
  (record) =>
    (record as { superclass?: unknown }).superclass !== null &&
    (record as { superclass?: unknown }).superclass !== undefined,
).length;

describe("HierarchyWell SSR", () => {
  it("server-renders every class node and the structural edges", () => {
    const fetchFn = createFetchSpy();
    const html = renderToString(
      definitionsPageAt(UIBLOCK_TERM, definitionsExplorerRecords, fetchFn),
    );

    expect(html).toContain('data-slot="explorer-canvas"');
    const nodeCount = html.match(/hierarchy-node-shell/g)?.length ?? 0;
    expect(fixtureClassRecords.length).toBeGreaterThan(0);
    expect(nodeCount).toBe(fixtureClassRecords.length);
    const structuralEdgeCount =
      html.match(/hierarchy-edge-structural/g)?.length ?? 0;
    expect(structuralEdgeCount).toBe(fixtureSubclassCount);
    // Semantic arcs (object properties) are in the server markup too —
    // the edge family whose absence made the old well an organigram.
    expect(html).toContain("hierarchy-edge-semantic");
    // The camera transform is a constant of the graph — explicit, never
    // measured.
    expect(html).toContain("translate(");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("server-renders the SELECTION'S ego-fade — the default visual state", () => {
    // The exhibit boots with a selection already made and its
    // neighbourhood already lit. Ours does the same, and does it on the
    // SERVER: `term` comes from the URL, so the fade is a pure function
    // of data both sides hold, and baking it into the markup means the
    // first paint is the finished picture rather than a flash of
    // undifferentiated graph.
    const html = renderToString(
      definitionsPageAt(
        UIBLOCK_TERM,
        definitionsExplorerRecords,
        createFetchSpy(),
      ),
    );

    // Faded nodes are in the SERVER html, not applied by an effect.
    expect(html).toContain("is-faded");
    // The selected node is marked, and is NOT among the faded.
    expect(html).toContain("is-selected");
    // Some nodes are spared (the one-hop neighbourhood): if EVERY node
    // were faded the fade would convey nothing. Counting faded NODES
    // against all nodes — bare "is-faded" would sweep in faded edges.
    const nodeCount = html.match(/hierarchy-node-shell/g)?.length ?? 0;
    const fadedNodes =
      html.match(/hierarchy-node-shell[^"]*is-faded/g)?.length ?? 0;
    expect(nodeCount).toBe(fixtureClassRecords.length);
    expect(fadedNodes).toBeGreaterThan(0);
    expect(fadedNodes).toBeLessThan(nodeCount);
    // UIBlock's live neighbourhood: its superclass Entity plus every
    // direct subclass. At least those are spared.
    expect(nodeCount - fadedNodes).toBeGreaterThanOrEqual(2);
  });

  it("server-renders NO fade when no term is selected (/definitions)", () => {
    // The term-less address has no selection, so nothing is privileged
    // and nothing recedes — the honest empty state, also server-rendered.
    const html = renderToString(
      definitionsPageAt(
        undefined,
        definitionsExplorerRecords,
        createFetchSpy(),
      ),
    );
    expect(html).toContain("hierarchy-node-shell");
    expect(html).not.toContain("is-faded");
    expect(html).not.toContain("is-selected");
  });
});
