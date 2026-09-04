/**
 * The well's mounted contracts, driven through the real page over the
 * captured records: class nodes are real term links (router addresses,
 * never component state), the selected node carries the router's
 * aria-current, and abstract classes are styled distinctly while their
 * accessible name stays the plain label.
 *
 * ONE mount for the lot: mounting the full triptych over the captured
 * store is the suite's heaviest render, so the assertions share it — and
 * carry an explicit timeout for fully-parallel runs.
 */

import { render, screen } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import definitionsExplorerRecords from "../__fixtures__/definitionsExplorerRecords.js";
import {
  DEFINITIONS_TEST_TIMEOUT_MS,
  definitionsPageAt,
  UIBLOCK_TERM,
} from "../__fixtures__/definitionsPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("HierarchyWell", () => {
  it("draws every class as a term-link node; selection and abstractness are visible", {
    timeout: DEFINITIONS_TEST_TIMEOUT_MS,
  }, () => {
    const fetchFn = createFetchSpy();
    const { container } = render(
      definitionsPageAt(UIBLOCK_TERM, definitionsExplorerRecords, fetchFn),
    );
    const well = container.querySelector<HTMLElement>(
      '[data-slot="explorer-canvas"]',
    );
    expect(well).not.toBeNull();
    if (!well) throw new Error("unreachable");

    // The well announces itself.
    expect(
      screen.getByLabelText("Class hierarchy", {
        selector: ".hierarchy-canvas",
      }),
    ).toBeInTheDocument();

    // Every captured class as an anchor with a real term address —
    // the population derived from the fixture, never hardcoded.
    // The population = the ontologies' own class lists, resolved through
    // their `classes` refs (lookalike OntologyClass records also ride the
    // store from property domains and the inspector's term lookup).
    const recordMap = definitionsExplorerRecords as Record<
      string,
      {
        __typename?: string;
        classes?: { __refs?: readonly string[] };
        isAbstract?: boolean;
      }
    >;
    const listedClasses = Object.values(recordMap)
      .filter((record) => record.__typename === "Ontology")
      .flatMap((record) => record.classes?.__refs ?? [])
      .map((ref) => recordMap[ref])
      .filter((record) => record !== undefined);
    const classCount = listedClasses.length;
    const nodeLinks = well.querySelectorAll("a.hierarchy-node");
    expect(classCount).toBeGreaterThan(0);
    expect(nodeLinks).toHaveLength(classCount);
    const hrefs = [...nodeLinks].map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/definitions/ds%3AUIBlock");
    expect(hrefs).toContain("/definitions/cs%3ACodeStandard");
    expect(hrefs).toContain("/definitions/anatomy%3ANode");

    // The selected term's node carries the router's aria-current.
    const current = well.querySelectorAll('a[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toBe("UI Block");

    // Abstract classes styled distinctly, names unpolluted — count
    // derived from the fixture's own isAbstract facets.
    const abstractCount = listedClasses.filter(
      (record) => record.isAbstract === true,
    ).length;
    const abstractNodes = well.querySelectorAll("a.hierarchy-node-abstract");
    expect(abstractNodes).toHaveLength(abstractCount);
    expect([...abstractNodes].map((node) => node.textContent)).toContain(
      "UI Block",
    );

    expect(fetchFn).not.toHaveBeenCalled();
  });
});
