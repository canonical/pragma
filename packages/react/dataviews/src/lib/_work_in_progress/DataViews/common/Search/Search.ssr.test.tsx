/**
 * A server render of the search: the form and its destination come from the
 * query the location carries, read when the provider is built, through the
 * same encoder the browser uses; and nothing observes — the source is
 * never asked.
 */
import { createMemoryLocation } from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createMachineProvider } from "../../../../../../testing/machines.js";
import DataViews from "../../Provider.js";
import Search from "./Search.js";

describe("DataViews.Search SSR", () => {
  it("renders the form and its destination on the server through the same encoder", () => {
    const location = createMemoryLocation({
      href: "/machines?status=failed&q=alder&page=2&size=50",
    });
    const { provider, source } = createMachineProvider({ location });
    // A command after construction: the destination follows the provider,
    // not only the URL it read.
    provider.setSort([{ field: "name", direction: "desc" }]);
    const html = renderToString(
      <DataViews provider={provider}>
        <Search />
      </DataViews>,
    );
    expect(html).toContain('method="get"');
    expect(html).toContain('type="search"');
    expect(html).toContain('name="q"');
    expect(html).toContain('value="alder"');
    expect(html).toContain('type="hidden" name="status" value="failed"');
    expect(html).toContain('type="hidden" name="page" value="1"');
    expect(html).toContain('type="hidden" name="size" value="50"');
    expect(html).toContain('type="hidden" name="sort" value="name__desc"');
    expect(location.read().has("sort")).toBe(false);
    expect(html).not.toContain('type="hidden" name="q"');
    expect(source.calls).toHaveLength(0);
  });
});
