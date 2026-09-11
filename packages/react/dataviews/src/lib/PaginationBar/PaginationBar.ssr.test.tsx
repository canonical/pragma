import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import PaginationBar from "./PaginationBar.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "ready"] },
]);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PaginationBar SSR", () => {
  it("renders on the server, claiming nothing before results", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const html = renderToString(
      <PaginationBar provider={createDataViewsProvider({ schema })} />,
    );
    expect(html).toContain('aria-label="Pagination"');
    expect(html).toContain("Items per page:");
    // No count yet, so no total and an empty summary.
    expect(html).not.toContain('class="total"');
    expect(html).toMatch(/class="summary"[^>]*><\/span>/);
    expect(error).not.toHaveBeenCalled();
  });

  it("renders results the provider already holds", () => {
    const provider = createDataViewsProvider({
      schema,
      window: { page: 1, size: 2 },
    });
    const requestId = provider.refresh();
    if (requestId === null) {
      throw new Error("expected a refresh request");
    }
    provider.complete(requestId, {
      status: "success",
      rows: [{ id: "m1" }, { id: "m2" }],
      count: 5,
    });
    const html = renderToString(<PaginationBar provider={provider} />);
    expect(html).toContain("Showing 1–2 out of 5 items");
    expect(html).toContain("of 3 pages");
  });
});
