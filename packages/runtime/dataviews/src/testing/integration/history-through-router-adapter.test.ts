/**
 * History by transition survives the one real router adapter there is: a
 * provider over `createPlatformLocation` on `@canonical/router-core`'s
 * memory adapter, whose history stack Back and Forward walk. A search
 * replaces the entry, a sort and a page move push one, Back and Forward
 * arrive through the port and are adopted, and nothing is written back:
 * every URL the provider touches goes through the port, and the adapter's
 * own record of navigations is what says so.
 */

import { createMemoryAdapter } from "@canonical/router-core";
import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare, declareSort } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createPlatformLocation } from "../../lib/location/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "cpu", kind: "number" }],
});

const harness = () => {
  const adapter = createMemoryAdapter();
  adapter.navigate("/machines?tab=overview");
  /** Every navigation the adapter was asked for, with whether it replaced. */
  const navigations: (readonly [string, boolean])[] = [];
  const recorded: typeof adapter = {
    ...adapter,
    navigate(url, options) {
      navigations.push([String(url), options?.replace === true]);
      adapter.navigate(url, options);
    },
  };
  const provider = createDataViewsProvider({
    collection: machines,
    source: createManualSource({
      capabilities: declare({
        search: { fields: ["name"] },
        sort: declareSort(["cpu"]),
      }),
    }).source,
    location: createPlatformLocation(recorded),
  });
  return { adapter, navigations, provider };
};

const searchOf = (adapter: ReturnType<typeof createMemoryAdapter>): string =>
  new URL(String(adapter.getLocation()), "http://localhost/").search;

describe("history through the router adapter", () => {
  it("replaces for a search, pushes for a sort and a page, keeping the host's parameter", () => {
    const { adapter, navigations, provider } = harness();
    const release = provider.observe();
    navigations.length = 0;
    provider.setSearch("ya");
    provider.setSearch("yak");
    provider.setSort([{ field: "cpu", direction: "desc" }]);
    provider.navigateWindow({ page: 2 });
    expect(navigations).toEqual([
      ["/machines?tab=overview&q=ya&page=1&size=50", true],
      ["/machines?tab=overview&q=yak&page=1&size=50", true],
      ["/machines?tab=overview&q=yak&sort=cpu__desc&page=1&size=50", false],
      ["/machines?tab=overview&q=yak&sort=cpu__desc&page=2&size=50", false],
    ]);
    release();
  });

  it("adopts Back and Forward through the adapter and writes nothing back", () => {
    const { adapter, navigations, provider } = harness();
    const release = provider.observe();
    provider.setSearch("yak");
    provider.setSort([{ field: "cpu", direction: "desc" }]);
    provider.navigateWindow({ page: 2 });
    navigations.length = 0;

    // Back: the entry before the page move, with the sort still in force.
    adapter.back();
    expect(searchOf(adapter)).toBe(
      "?tab=overview&q=yak&sort=cpu__desc&page=1&size=50",
    );
    expect(provider.state.get().window.page).toBe(1);
    expect(provider.state.get().slice.sort).toEqual([
      { field: "cpu", direction: "desc" },
    ]);

    // Back again: before the sort. The typing never left an entry of its
    // own, so this is the entry the reader arrived on, with the search
    // replaced into it.
    adapter.back();
    expect(searchOf(adapter)).toBe("?tab=overview&q=yak&page=1&size=50");
    expect(provider.state.get().slice.sort).toEqual([]);
    expect(provider.state.get().slice.search).toBe("yak");

    // Forward, twice: the same entries, adopted again.
    adapter.forward();
    adapter.forward();
    expect(provider.state.get().window.page).toBe(2);
    expect(provider.state.get().slice.sort).toEqual([
      { field: "cpu", direction: "desc" },
    ]);
    // Adopted through the port's subscribe, and never written back.
    expect(navigations).toEqual([]);
    release();
  });
});
