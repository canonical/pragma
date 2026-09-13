/**
 * The reading page's warm-store proof: a store seeded with the fixture
 * renders the whole reading column WITHOUT the network being consulted —
 * with teeth, because the same render against an empty store does hit the
 * network. Plus the two not-found branches (the R4 precedent's in-canvas
 * posture: a 200 with an honest alert, never an HTTP 404).
 *
 * THE SECOND NOT-FOUND BRANCH IS NEW AND IS THE POINT OF THIS FILE.
 * `codeStandard(uri:)` returned null for anything that was not a standard,
 * so the route got its type check for free. `node(id:)` returns ANY node,
 * so `/standards/<a component IRI>` would render a standards page for a
 * component unless the page guards it. Nothing in the acceptance gate can
 * see that failure — the gate executes the operation against its own
 * fixture variables and an operation can be perfectly contract-clean while
 * the deployment hands it the wrong thing. This test is what stands
 * between a green gate and a broken deployment.
 */

import { render, screen } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import { describe, expect, it, vi } from "vitest";
import standardEntityRecords from "../__fixtures__/standardEntityRecords.js";
import {
  CS_NAMESPACE,
  LINK_COMPONENT_CURIE,
  LINK_COMPONENT_URI,
  STANDARDS_TEST_TIMEOUT_MS,
  standardReadingPageAt,
} from "../__fixtures__/standardsPageHarness.js";

/** A fetch spy that never settles: any call means "the network was hit". */
const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/** An unknown IRI resolved to null — the server's own answer, verbatim. */
const NO_SUCH_URI = `${CS_NAMESPACE}no.such.standard`;
const notFoundRecords = {
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'ontologyClass(uri:"cs:CodeStandard")': {
      __ref: `${CS_NAMESPACE}CodeStandard`,
    },
    [`node(id:"${NO_SUCH_URI}")`]: null,
  },
  [`${CS_NAMESPACE}CodeStandard`]: {
    __id: `${CS_NAMESPACE}CodeStandard`,
    __typename: "OntologyClass",
    uri: `${CS_NAMESPACE}CodeStandard`,
    subclasses: { __refs: [] },
  },
} as unknown as RecordMap;

/**
 * A REAL node of the WRONG class, at the standards route. Deliberately a
 * `ds:` component and not a metro fixture: the failure this guards against
 * is a pragma deployment addressing one of its own entities through the
 * wrong lens, and that is what the store must contain to prove it.
 */
const WRONG_CLASS_URI = "https://ds.canonical.com/global.component.button";
const wrongClassRecords = {
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'ontologyClass(uri:"cs:CodeStandard")': {
      __ref: "http://pragma.canonical.com/codestandards#CodeStandard",
    },
    'node(id:"https://ds.canonical.com/global.component.button")': {
      __ref: "https://ds.canonical.com/global.component.button",
    },
  },
  "http://pragma.canonical.com/codestandards#CodeStandard": {
    __id: "http://pragma.canonical.com/codestandards#CodeStandard",
    __typename: "OntologyClass",
    uri: "http://pragma.canonical.com/codestandards#CodeStandard",
    subclasses: {
      __refs: [],
    },
  },
  "https://ds.canonical.com/global.component.button": {
    __id: "https://ds.canonical.com/global.component.button",
    __typename: "Component",
    uri: "https://ds.canonical.com/global.component.button",
    _meta: {
      __ref: "client:https://ds.canonical.com/global.component.button:_meta",
    },
  },
  "client:https://ds.canonical.com/global.component.button:_meta": {
    __id: "client:https://ds.canonical.com/global.component.button:_meta",
    __typename: "EntityMeta",
    curie: "ds:global.component.button",
    title: "Button",
    type: {
      __ref: "https://ds.canonical.com/Component",
    },
    definition: "A button.",
  },
  "https://ds.canonical.com/Component": {
    __id: "https://ds.canonical.com/Component",
    __typename: "OntologyClass",
    uri: "https://ds.canonical.com/Component",
    _meta: {
      __ref: "client:https://ds.canonical.com/Component:_meta",
    },
  },
  "client:https://ds.canonical.com/Component:_meta": {
    __id: "client:https://ds.canonical.com/Component:_meta",
    __typename: "EntityMeta",
    title: "Component",
  },
  "client:__type:Component": {
    __id: "client:__type:Component",
    __typename: "__TypeSchema",
    __isNode: true,
  },
} as unknown as RecordMap;

describe("StandardReadingPage against a warm store", () => {
  it(
    "renders the reading column from the fixture without fetching",
    () => {
      const fetchFn = createFetchSpy();
      render(
        standardReadingPageAt(
          LINK_COMPONENT_URI,
          standardEntityRecords,
          fetchFn,
        ),
      );

      // Identity header: `_meta.title`, which is TOTAL — this standard
      // asserts no name, so the title is the IRI's local name and never a
      // fabricated title-case.
      const heading = screen.getByRole("heading", {
        level: 1,
        name: "react.component.link_component",
      });
      expect(heading.id).toBe("standard-reading-title");
      // The compact identity still reaches the reader…
      expect(screen.getByText(LINK_COMPONENT_CURIE)).toBeInTheDocument();
      // …and the class replaces the old category line.
      expect(screen.getByText(/class: CodeStandard/)).toBeInTheDocument();
      // The breadcrumb routes back to the index.
      const breadcrumb = screen.getByRole("navigation", {
        name: "Breadcrumb",
      });
      expect(breadcrumb.querySelector("a")?.getAttribute("href")).toBe(
        "/standards",
      );
      // Prose: plain-text paragraph blocks from `_meta.definition` — the
      // blank-line split yields MULTIPLE paragraphs, and the source's
      // inline code marks show verbatim (no markdown pipeline, R8).
      expect(screen.getByText(/A \*complex\* component/)).toBeInTheDocument();
      expect(
        document.querySelectorAll(".standard-article-prose p").length,
      ).toBeGreaterThan(1);
      // Head: the client-only title (document.title via useHead).
      expect(document.title).toBe(
        "react.component.link_component — Pragma docs",
      );
      // …and the network was NEVER consulted.
      expect(fetchFn).not.toHaveBeenCalled();
    },
    STANDARDS_TEST_TIMEOUT_MS,
  );

  it(
    "renders the in-canvas not-found alert for a null node (R4), no fetch",
    () => {
      const fetchFn = createFetchSpy();
      render(standardReadingPageAt(NO_SUCH_URI, notFoundRecords, fetchFn));

      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain(NO_SUCH_URI);
      expect(alert.textContent).toContain("No standard found");
      expect(document.title).toBe("Standard not found — Pragma docs");
      expect(fetchFn).not.toHaveBeenCalled();
    },
    STANDARDS_TEST_TIMEOUT_MS,
  );

  it(
    "refuses a node of the WRONG class — the guard the gate cannot provide",
    () => {
      // The store holds a real, fully-populated Component. Without the
      // `boundClass` guard this renders as a standards article: right
      // layout, right breadcrumb, entirely wrong lens. The permitted set
      // is `boundClass.uri` plus one level of its subclasses, and
      // `ds:Component` is in neither.
      const fetchFn = createFetchSpy();
      render(
        standardReadingPageAt(WRONG_CLASS_URI, wrongClassRecords, fetchFn),
      );

      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain("No standard found");
      expect(alert.textContent).toContain(WRONG_CLASS_URI);
      // Nothing of the component leaked into the reading column.
      expect(screen.queryByText("Button")).not.toBeInTheDocument();
      expect(
        document.querySelector(".ds.standard-article"),
      ).not.toBeInTheDocument();
      expect(document.title).toBe("Standard not found — Pragma docs");
      expect(fetchFn).not.toHaveBeenCalled();
    },
    STANDARDS_TEST_TIMEOUT_MS,
  );

  it(
    "renders the route's OWN error copy when the query really fails (AV-334 gap #3)",
    async () => {
      // A rejecting fetch, not a synthetic thrower: the failure originates
      // in the network layer and travels the real path — Relay surfaces it
      // through the suspended query, and the route's own ErrorBoundary
      // (not a test double) catches it. The copy asserted below is the
      // string StandardReadingPage passes as `fallback`.
      const fetchFn = vi.fn(() =>
        Promise.reject(new Error("graph backend down")),
      ) as unknown as FetchFunction;
      render(standardReadingPageAt(LINK_COMPONENT_URI, undefined, fetchFn));

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("The graph query failed.");
      // The breadcrumb sits OUTSIDE the boundary, so it survives the
      // failure — the page degrades, it does not blank.
      expect(
        screen.getByRole("navigation", { name: "Breadcrumb" }),
      ).toBeInTheDocument();
    },
    STANDARDS_TEST_TIMEOUT_MS,
  );

  it(
    "has teeth: the same render against an empty store hits the network",
    () => {
      const fetchFn = createFetchSpy();
      render(standardReadingPageAt(LINK_COMPONENT_URI, undefined, fetchFn));

      expect(screen.getByText("Loading the standard…")).toBeInTheDocument();
      // The breadcrumb (outside the boundaries) still stands.
      expect(
        screen.getByRole("navigation", { name: "Breadcrumb" }),
      ).toBeInTheDocument();
      expect(fetchFn).toHaveBeenCalledTimes(1);
    },
    STANDARDS_TEST_TIMEOUT_MS,
  );
});
