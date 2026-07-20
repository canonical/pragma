/**
 * The inspector's four states, driven through the real page over captured
 * records: the class view (ds:UIBlock), the property view
 * (ds:hasSubcomponent), the instance list with its D31 landing rule
 * (ds:Component — component instances link to their live entity route,
 * everything else is plain text), and the unknown-term alert (null
 * lookups synthesised onto the captured store, exactly the shape the
 * server serialises for an unknown term).
 */

import "../__fixtures__/stubReactFlowGlobals.js";
import { render, screen, within } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import { describe, expect, it, vi } from "vitest";
import definitionsExplorerRecords from "../__fixtures__/definitionsExplorerRecords.js";
import definitionsExplorerRecordsComponent from "../__fixtures__/definitionsExplorerRecordsComponent.js";
import definitionsExplorerRecordsProperty from "../__fixtures__/definitionsExplorerRecordsProperty.js";
import {
  definitionsPageAt,
  PROPERTY_TERM,
  UIBLOCK_TERM,
} from "../__fixtures__/definitionsPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

const UNKNOWN_TERM = "ds:NoSuchTerm";

/** The captured store plus the null lookups an unknown term stores —
 * verified live: `/definitions/ds%3ANoSuchTerm` serialises exactly
 * `ontologyClass(uri:"…"): null` and `ontologyProperty(uri:"…"): null`
 * on `client:root`. */
const unknownTermRecords = {
  ...definitionsExplorerRecords,
  "client:root": {
    ...(definitionsExplorerRecords["client:root"] as Record<string, unknown>),
    [`ontologyClass(uri:"${UNKNOWN_TERM}")`]: null,
    [`ontologyProperty(uri:"${UNKNOWN_TERM}")`]: null,
  },
} as unknown as RecordMap;

const inspector = (): HTMLElement =>
  screen.getByRole("complementary", { name: "Term inspector" });

describe("TermInspector", () => {
  it("renders the class view for ds:UIBlock, no fetch", {
    timeout: 20_000,
  }, () => {
    const fetchFn = createFetchSpy();
    render(
      definitionsPageAt(UIBLOCK_TERM, definitionsExplorerRecords, fetchFn),
    );
    const panel = inspector();

    expect(panel.getAttribute("aria-live")).toBe("polite");
    expect(
      within(panel).getByRole("heading", { level: 2, name: "UI Block" }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(/category of visual or abstract entity/),
    ).toBeInTheDocument();
    // Superclass chain, direct parent marked.
    const superclasses = within(panel).getByRole("heading", {
      name: "Superclasses",
    }).nextElementSibling as HTMLElement;
    expect(superclasses.textContent).toContain("UI Element");
    expect(superclasses.textContent).toContain("(direct)");
    expect(superclasses.textContent).toContain("Entity");
    // Subclasses as term links.
    expect(
      within(panel)
        .getByRole("link", { name: "Component" })
        .getAttribute("href"),
    ).toBe("/definitions/ds%3AComponent");
    // The per-class property table with inherited rows and prefixed ranges.
    const table = within(panel).getByRole("table");
    expect(within(table).getByText("hasVariant")).toBeInTheDocument();
    expect(within(table).getAllByText("ds:UIBlock").length).toBeGreaterThan(0);
    expect(within(table).getAllByText(/inherited/).length).toBeGreaterThan(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("renders the property view for ds:hasSubcomponent", {
    timeout: 20_000,
  }, () => {
    const fetchFn = createFetchSpy();
    render(
      definitionsPageAt(
        PROPERTY_TERM,
        definitionsExplorerRecordsProperty,
        fetchFn,
      ),
    );
    const panel = inspector();

    expect(
      within(panel).getByRole("heading", { level: 2, name: "hasSubcomponent" }),
    ).toBeInTheDocument();
    const terms = within(panel)
      .getAllByRole("term")
      .map((dt) => dt.textContent);
    expect(terms).toEqual([
      "Kind",
      "Functional",
      "Range",
      "Domain",
      "Inverse",
      "Acceptance criteria",
      "Completion guidance",
    ]);
    expect(within(panel).getByText("ds:Subcomponent")).toBeInTheDocument();
    // Domain and inverse are term links.
    expect(
      within(panel)
        .getByRole("link", { name: "Component" })
        .getAttribute("href"),
    ).toBe("/definitions/ds%3AComponent");
    expect(
      within(panel)
        .getByRole("link", { name: "parentComponent" })
        .getAttribute("href"),
    ).toBe("/definitions/ds%3AparentComponent");
    expect(
      within(panel).getByText(/Inverse of ds:parentComponent/),
    ).toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("links component instances to their live entity route, D31 (others stay text)", {
    timeout: 20_000,
  }, () => {
    const fetchFn = createFetchSpy();
    render(
      definitionsPageAt(
        "ds:Component",
        definitionsExplorerRecordsComponent,
        fetchFn,
      ),
    );
    const panel = inspector();

    // Component instances land on /components/<encoded uri> — the only
    // live entity route (the D31 landing rule).
    expect(
      within(panel)
        .getByRole("link", { name: "Accordion" })
        .getAttribute("href"),
    ).toBe("/components/ds%3Aglobal.component.accordion");
    // The truncation line is honest about the page size.
    expect(within(panel).getByText(/and more/)).toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("renders the unknown-term alert (a 200 posture, R4) without fetching", {
    timeout: 20_000,
  }, () => {
    const fetchFn = createFetchSpy();
    render(definitionsPageAt(UNKNOWN_TERM, unknownTermRecords, fetchFn));

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("No term at");
    expect(alert.textContent).toContain(UNKNOWN_TERM);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
