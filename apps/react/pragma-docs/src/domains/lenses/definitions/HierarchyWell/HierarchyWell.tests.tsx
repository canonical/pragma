/**
 * The well's mounted contracts, driven through the real page over the
 * captured records: class nodes are real term links (router addresses,
 * never component state), the selected node carries the router's
 * aria-current, and abstract classes are styled distinctly while their
 * accessible name stays the plain label.
 *
 * ONE mount for the lot: mounting the full triptych (React Flow + the
 * captured store) is the suite's heaviest render, so the assertions
 * share it — and carry an explicit timeout for fully-parallel runs.
 */

import "../__fixtures__/stubReactFlowGlobals.js";
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
      screen.getByLabelText("Class hierarchy", { selector: ".react-flow" }),
    ).toBeInTheDocument();

    // All 29 live classes (17 ds + 3 cs + 9 anatomy) as anchors with
    // real term addresses.
    const nodeLinks = well.querySelectorAll("a.hierarchy-node");
    expect(nodeLinks).toHaveLength(29);
    const hrefs = [...nodeLinks].map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/definitions/ds%3AUIBlock");
    expect(hrefs).toContain("/definitions/cs%3ACodeStandard");
    expect(hrefs).toContain("/definitions/anatomy%3ANode");

    // The selected term's node carries the router's aria-current.
    const current = well.querySelectorAll('a[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toBe("UI Block");

    // Abstract classes styled distinctly, names unpolluted: the live
    // graph's four (ds Entity/UIElement/UIBlock + anatomy Node).
    const abstractNodes = well.querySelectorAll("a.hierarchy-node-abstract");
    expect(abstractNodes).toHaveLength(4);
    expect([...abstractNodes].map((node) => node.textContent)).toContain(
      "UI Block",
    );

    expect(fetchFn).not.toHaveBeenCalled();
  });
});
