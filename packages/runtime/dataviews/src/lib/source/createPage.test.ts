import { describe, expect, it } from "vitest";
import createPage from "./createPage.js";

describe("createPage", () => {
  it("counts exactly what is given and knows nothing of what is not", () => {
    expect(createPage({ rows: [{ id: "a" }], matched: 12 })).toEqual({
      rows: [{ id: "a" }],
      groups: null,
      counts: {
        pageable: { kind: "exact", value: 12 },
        matched: { kind: "exact", value: 12 },
        total: { kind: "unknown" },
      },
      facets: {},
      more: null,
      cursors: null,
    });
  });

  it("carries the facets given, as the backend answered them", () => {
    const facets = {
      status: {
        kind: "values" as const,
        values: [
          { value: "failed", count: { kind: "exact" as const, value: 2 } },
        ],
      },
    };
    const page = createPage({ rows: [], facets });
    expect(page.facets).toEqual(facets);
    expect(page.facets).not.toBe(facets);
    expect(Object.isFrozen(page.facets)).toBe(true);
  });

  it("carries the total, whether more exists and the cursors as given", () => {
    expect(
      createPage({
        rows: [],
        total: 40,
        more: true,
        cursors: { next: "n", previous: null },
      }),
    ).toEqual({
      rows: [],
      groups: null,
      counts: {
        pageable: { kind: "unknown" },
        matched: { kind: "unknown" },
        total: { kind: "exact", value: 40 },
      },
      facets: {},
      more: true,
      cursors: { next: "n", previous: null },
    });
    expect(createPage({ rows: [], more: false }).more).toBe(false);
  });

  it("hands back a frozen page, counts included", () => {
    const page = createPage({ rows: [] });
    expect(Object.isFrozen(page)).toBe(true);
    expect(Object.isFrozen(page.counts)).toBe(true);
  });
});
