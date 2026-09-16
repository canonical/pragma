/**
 * A server render of the connected composition answers the URL it is asked
 * for: the provider reads the location when it is built, `refresh()` asks
 * a source that answers at once for the page within the call, and the
 * markup carries the rows of that page in that order, the one sorted
 * header, and the pagination on that page — with nothing subscribed. A
 * source that cannot answer at once renders pending.
 */

import {
  createArraySource,
  createDataViewsProvider,
  createMemoryLocation,
  type QueryLocation,
} from "@canonical/dataviews-core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SERVER_RENDER_HREF } from "../../../testing/fixtures.js";
import MachineComposition from "../../../testing/MachineComposition.js";
import {
  buildFleet,
  createMachineProvider,
  machines,
} from "../../../testing/machines.js";

/** The pagination bar's markup, where the page and its forms live. */
const readPagination = (markup: string): string =>
  markup.match(/<nav[\s\S]*?<\/nav>/)?.at(0) ?? "";

/** One select's markup, by its name. */
const readSelect = (markup: string, name: string): string =>
  markup
    .match(new RegExp(`<select[^>]*name="${name}"[\\s\\S]*?</select>`))
    ?.at(0) ?? "";

describe("a server render of the connected composition", () => {
  it("carries the URL's query and the rows of its page, subscribing to nothing", () => {
    const fleet = buildFleet(130);
    const memory = createMemoryLocation({ href: SERVER_RENDER_HREF });
    const subscribe = vi.fn(memory.subscribe);
    const write = vi.fn(memory.write);
    const location: QueryLocation = { read: memory.read, subscribe, write };
    const provider = createDataViewsProvider({
      collection: machines,
      source: createArraySource({
        rows: fleet,
        collection: machines,
        searchFields: ["name"],
      }),
      location,
    });
    provider.refresh();
    // Asked for within the call, subscribing to nothing.
    expect(subscribe).not.toHaveBeenCalled();
    const markup = renderToString(<MachineComposition provider={provider} />);

    // The rows of page two, running only, by cores descending.
    const expected = fleet
      .filter((row) => row.status === "running")
      .sort((a, b) => b.cores - a.cores)
      .slice(50, 100)
      .map((row) => row.name);
    expect(expected).toHaveLength(37);
    expect(markup.match(/host-\d{3}/g)).toEqual(expected);
    expect(markup).not.toContain("Loading…");

    // One header claims the ordering.
    expect(markup.match(/aria-sort="[a-z]+"/g)).toEqual([
      'aria-sort="descending"',
    ]);

    // The pagination stands on page two of fifty, and no form of it spells
    // a first page it is not on.
    const pagination = readPagination(markup);
    expect(readSelect(pagination, "page")).toMatch(
      /<option(?=[^>]*value="2")(?=[^>]*selected)[^>]*>/,
    );
    expect(readSelect(pagination, "size")).toMatch(
      /<option(?=[^>]*value="50")(?=[^>]*selected)[^>]*>/,
    );
    expect(pagination).toContain("of 2 pages");
    expect(pagination).toContain("Showing 51–87 out of 87 rows");
    expect(pagination).not.toMatch(
      /<input(?=[^>]*type="hidden")(?=[^>]*name="page")[^>]*>/,
    );
    // Its links lead where the location loop would write, without scripts.
    expect(pagination).toContain(
      'href="?status=running&amp;sort=cores__desc&amp;page=1&amp;size=50"',
    );

    // Read, never subscribed to or written.
    expect(subscribe).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("renders pending when the source cannot answer within the call", () => {
    const { provider, source } = createMachineProvider({
      location: createMemoryLocation({ href: SERVER_RENDER_HREF }),
    });
    provider.refresh();
    const markup = renderToString(<MachineComposition provider={provider} />);
    expect(markup).toContain("Loading…");
    expect(markup).not.toMatch(/host-\d{3}/);
    // Nothing started: only an execution could answer it.
    expect(source.calls).toHaveLength(0);
    expect(provider.state.get().result.status).toBe("pending");
  });
});
