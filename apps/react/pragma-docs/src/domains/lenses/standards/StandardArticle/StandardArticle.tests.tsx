/**
 * StandardArticle through the real page fan-out (see
 * `standardsPageHarness`): the reading column's identity header and its
 * plain-text prose blocks all render from the fixture, never the network.
 * The prose contract is the honest v1 posture: blank-line splits into
 * paragraphs, single newlines kept by `pre-line`, inline code marks
 * verbatim (no markdown pipeline).
 *
 * The `Extends` section is gone and is not asserted here any more.
 * `CodeStandard.extends` is an ontology-derived relation and the contract
 * cannot traverse an arbitrary instance-level relation at all, so those
 * cross-links cannot exist against an arbitrary provider.
 */

import { render, screen } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import standardEntityRecords from "../__fixtures__/standardEntityRecords.js";
import {
  LINK_COMPONENT_CURIE,
  LINK_COMPONENT_URI,
  STANDARDS_TEST_TIMEOUT_MS,
  standardReadingPageAt,
} from "../__fixtures__/standardsPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("StandardArticle", () => {
  it(
    "renders header and paragraph blocks from the fixture",
    () => {
      const fetchFn = createFetchSpy();
      const { container } = render(
        standardReadingPageAt(
          LINK_COMPONENT_URI,
          standardEntityRecords,
          fetchFn,
        ),
      );

      const article = container.querySelector(".ds.standard-article");
      expect(article).not.toBeNull();
      // The article IS the layout.reading prose column.
      expect(article?.getAttribute("data-slot")).toBe("reading-canvas");
      // Identity: the COMPACT form in code voice inside the meta line —
      // `uri` is now a 60-character IRI and belongs in the address bar,
      // not at a reader.
      expect(article?.querySelector("code")?.textContent).toBe(
        LINK_COMPONENT_CURIE,
      );
      // The entity's class, which replaced the category line.
      expect(article?.textContent).toContain("class: CodeStandard");
      // Prose: `_meta.definition` holds blank-line breaks, so the split
      // yields multiple <p> blocks; the source's inline marks (backticks,
      // asterisks) survive verbatim — plain text, no markdown pipeline
      // (R8).
      const blocks = [
        ...(article?.querySelectorAll(".standard-article-prose p") ?? []),
      ];
      expect(blocks.length).toBeGreaterThan(1);
      expect(blocks.at(0)?.textContent).toContain("A *complex* component");
      expect(article?.textContent).toContain("`LinkComponentProps`");
      // The Extends section is gone, not merely empty.
      expect(
        screen.queryByRole("heading", { level: 2, name: "Extends" }),
      ).not.toBeInTheDocument();
      expect(fetchFn).not.toHaveBeenCalled();
    },
    STANDARDS_TEST_TIMEOUT_MS,
  );
});
