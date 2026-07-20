/**
 * The reading page's warm-store proof: a store seeded with the captured
 * fixture renders the whole reading column WITHOUT the network being
 * consulted — with teeth, because the same render against an empty store
 * does hit the network. Plus the null standard (the R4 precedent's
 * in-canvas not-found: a 200 with an honest alert, never an HTTP 404).
 */

import { render, screen } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import type { RecordMap } from "relay-runtime/store/RelayStoreTypes.js";
import { describe, expect, it, vi } from "vitest";
import standardEntityRecords from "../__fixtures__/standardEntityRecords.js";
import {
  LINK_COMPONENT_EXTENDS_URI,
  LINK_COMPONENT_URI,
  STANDARDS_TEST_TIMEOUT_MS,
  standardReadingPageAt,
} from "../__fixtures__/standardsPageHarness.js";

/** A fetch spy that never settles: any call means "the network was hit". */
const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

/** An unknown URI resolved to null — the server's own answer, verbatim. */
const NO_SUCH_URI = "cs:no.such.standard";
const notFoundRecords = {
  "client:root": {
    __id: "client:root",
    __typename: "__Root",
    'codeStandard(uri:"cs:no.such.standard")': null,
  },
} as unknown as RecordMap;

describe("StandardReadingPage against a warm store", () => {
  it(
    "renders the reading column from the captured fixture without fetching",
    () => {
      const fetchFn = createFetchSpy();
      render(
        standardReadingPageAt(
          LINK_COMPONENT_URI,
          standardEntityRecords,
          fetchFn,
        ),
      );

      // Identity header: no display name in the graph for this standard,
      // so the URI IS the title (never a fabricated title-case).
      const heading = screen.getByRole("heading", {
        level: 1,
        name: LINK_COMPONENT_URI,
      });
      expect(heading.id).toBe("standard-reading-title");
      expect(screen.getByText(/category: react/)).toBeInTheDocument();
      // The breadcrumb routes back to the index.
      const breadcrumb = screen.getByRole("navigation", {
        name: "Breadcrumb",
      });
      expect(breadcrumb.querySelector("a")?.getAttribute("href")).toBe(
        "/standards",
      );
      // Prose: plain-text paragraph blocks from the captured description —
      // the blank-line split yields MULTIPLE paragraphs, and the source's
      // inline code marks show verbatim (no markdown pipeline, R8).
      expect(screen.getByText(/A \*complex\* component/)).toBeInTheDocument();
      expect(
        document.querySelectorAll(".standard-article-prose p").length,
      ).toBeGreaterThan(1);
      // Extends: the captured cross-link addresses ITS reading page.
      expect(
        screen
          .getByRole("link", { name: LINK_COMPONENT_EXTENDS_URI })
          .getAttribute("href"),
      ).toBe(`/standards/${encodeURIComponent(LINK_COMPONENT_EXTENDS_URI)}`);
      // Head: the client-only title (document.title via useHead).
      expect(document.title).toBe(`${LINK_COMPONENT_URI} — Pragma docs`);
      // …and the network was NEVER consulted.
      expect(fetchFn).not.toHaveBeenCalled();
    },
    STANDARDS_TEST_TIMEOUT_MS,
  );

  it(
    "renders the in-canvas not-found alert for a null standard (R4), no fetch",
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
