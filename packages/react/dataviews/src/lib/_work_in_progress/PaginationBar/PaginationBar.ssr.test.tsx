import { createPage, DEFAULT_WINDOW } from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMachineProvider,
  machine,
} from "../../../../testing/machines.js";
import PaginationBar from "./PaginationBar.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PaginationBar SSR", () => {
  it("renders on the server, claiming nothing before results", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { provider } = createMachineProvider();
    const html = renderToString(<PaginationBar provider={provider} />);
    expect(html).toContain('aria-label="Pagination"');
    expect(html).toContain("Items per page:");
    // No count yet, so no total and an empty summary.
    expect(html).not.toContain('class="total"');
    expect(html).toMatch(/class="summary"[^>]*><\/span>/);
    expect(error).not.toHaveBeenCalled();
  });

  it("renders the same markup twice and asks the source for nothing", () => {
    // No effect runs on the server, so the bar never observes the provider:
    // the source is not executed, and two renders of one provider agree.
    const { provider, source } = createMachineProvider();
    const html = renderToString(<PaginationBar provider={provider} />);
    expect(renderToString(<PaginationBar provider={provider} />)).toBe(html);
    expect(source.calls).toHaveLength(0);
    expect(provider.state.get().pendingRequestId).toBe(null);
  });

  it("renders results the provider already holds", () => {
    const { provider, source } = createMachineProvider({
      seed: { window: { ...DEFAULT_WINDOW, page: 1, size: 2 } },
    });
    // Fed through the host by hand: nothing observes the provider here.
    const host = readProviderHost(provider);
    host.complete(host.refresh(), {
      status: "succeeded",
      page: createPage({
        rows: [machine("m1", "one"), machine("m2", "two")],
        matched: 5,
        total: 5,
      }),
    });
    const html = renderToString(<PaginationBar provider={provider} />);
    expect(html).toContain("Showing 1–2 out of 5 items");
    expect(html).toContain("of 3 pages");
    expect(source.calls).toHaveLength(0);
  });
});
