/**
 * StandardArticle through the real page fan-out (see
 * `standardsPageHarness`): the reading column's identity header, the
 * plain-text prose blocks, and the `extends` cross-links all render from
 * the captured fixture, never the network. The prose contract is the
 * honest v1 posture: blank-line splits into paragraphs, single newlines
 * kept by `pre-line`, inline code marks verbatim (no markdown pipeline).
 */

import { render, screen } from "@testing-library/react";
import type { FetchFunction } from "relay-runtime";
import { describe, expect, it, vi } from "vitest";
import standardEntityRecords from "../__fixtures__/standardEntityRecords.js";
import {
  LINK_COMPONENT_EXTENDS_URI,
  LINK_COMPONENT_URI,
  STANDARDS_TEST_TIMEOUT_MS,
  standardReadingPageAt,
} from "../__fixtures__/standardsPageHarness.js";

const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

describe("StandardArticle", () => {
  it(
    "renders header, paragraph blocks, and extends links from the fixture",
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
      // Identity: URI in code voice inside the meta line.
      expect(article?.querySelector("code")?.textContent).toBe(
        LINK_COMPONENT_URI,
      );
      expect(article?.textContent).toContain("category: react");
      // Prose: the captured description holds blank-line breaks, so the
      // split yields multiple <p> blocks; the source's inline marks
      // (backticks, asterisks) survive verbatim — plain text, no
      // markdown pipeline (R8).
      const blocks = [
        ...(article?.querySelectorAll(".standard-article-prose p") ?? []),
      ];
      expect(blocks.length).toBeGreaterThan(1);
      expect(blocks.at(0)?.textContent).toContain("A *complex* component");
      expect(article?.textContent).toContain("`LinkComponentProps`");
      // Extends: heading + the one captured cross-link.
      expect(
        screen.getByRole("heading", { level: 2, name: "Extends" }),
      ).toBeInTheDocument();
      expect(
        screen
          .getByRole("link", { name: LINK_COMPONENT_EXTENDS_URI })
          .getAttribute("href"),
      ).toBe(`/standards/${encodeURIComponent(LINK_COMPONENT_EXTENDS_URI)}`);
      expect(fetchFn).not.toHaveBeenCalled();
    },
    STANDARDS_TEST_TIMEOUT_MS,
  );
});
