/**
 * The provider/Location authority loop. Mutation-tested: each expectation
 * fails if a direction of the loop, its echo guard or its release is
 * dropped.
 */

import { describe, expect, it, vi } from "vitest";
import {
  declareCapabilities,
  NOTHING_DECLARED,
} from "../../../testing/fixtures.js";
import createDataViewsProvider from "../provider/createDataViewsProvider.js";
import DEFAULT_WINDOW from "../query/defaultWindow.js";
import type { Query, ResultWindow, Slice } from "../query/types.js";
import type { Completion } from "../result/types.js";
import type { RowRecord } from "../rows/types.js";
import createSchema from "../schema/createSchema.js";
import createArraySource from "../source/createArraySource.js";
import createSourceBinding from "../source/createSourceBinding.js";
import type { LocationHost } from "./createLocationBinding.js";
import createLocationBinding from "./createLocationBinding.js";
import createMemoryLocation from "./createMemoryLocation.js";

const machines = () =>
  createSchema([
    {
      field: "status",
      kind: "choices",
      options: ["failed", "cancelled", "ready"],
    },
    { field: "cpu", kind: "number", min: 0, max: 64 },
    { field: "owner", kind: "flag" },
  ]);

/** A provider behind a counting host: adoptions are the observable here. */
const tracked = (provider: ReturnType<typeof machinesProvider>) => {
  const adopt = vi.fn((query: Query): string | null => provider.adopt(query));
  const host: LocationHost = {
    schema: provider.schema,
    state: provider.state,
    capabilities: provider.capabilities,
    adopt,
  };
  return { host, adopt };
};

/** One exactly counted page of rows, as a source delivers it. */
const delivered = (rows: readonly RowRecord[]): Completion => {
  const count = { kind: "exact" as const, value: rows.length };
  return {
    status: "succeeded",
    page: {
      rows,
      groups: null,
      counts: { visible: count, matched: count, total: count },
      more: null,
      cursors: null,
    },
  };
};

/** A memory location that records every write with its history mode. */
const recording = (href: string) => {
  const memory = createMemoryLocation({ href });
  const writes: (readonly [string, string])[] = [];
  const location = {
    ...memory,
    write: (
      next: URLSearchParams,
      options?: { readonly history?: "push" | "replace" },
    ) => {
      writes.push([next.toString(), options?.history ?? "replace"]);
      memory.write(next, options);
    },
  };
  return { memory, location, writes };
};

/** Two failed machines and three ready ones, for a source to execute over. */
const fleet: readonly RowRecord[] = [
  { id: "m1", status: "failed", cpu: 4 },
  { id: "m2", status: "ready", cpu: 2 },
  { id: "m3", status: "ready", cpu: 8 },
  { id: "m4", status: "failed", cpu: 1 },
  { id: "m5", status: "ready", cpu: 16 },
];

const machinesProvider = (slice?: Slice, window?: ResultWindow) =>
  createDataViewsProvider({ schema: machines(), slice, window });

const windowAt = (overrides: Partial<ResultWindow> = {}): ResultWindow => ({
  ...DEFAULT_WINDOW,
  ...overrides,
});

describe("createLocationBinding", () => {
  it("subscribes to nothing until it is observed", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines?status=failed" });
    createLocationBinding({ host: provider, location });
    expect(provider.state.get().slice.filter).toEqual([]);
    expect(location.read().toString()).toBe("status=failed");
  });

  it("takes the location's query when it carries one", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({
      href: "/machines?status=failed&status=cancelled&page=2",
    });
    const release = createLocationBinding({
      host: provider,
      location,
    }).observe();
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed", "cancelled"] },
    ]);
    expect(provider.state.get().window).toEqual(windowAt({ page: 2 }));
    release();
  });

  it("writes the host's seed to a location carrying no query", () => {
    const provider = machinesProvider({
      filter: [{ field: "cpu", operator: "gte", operands: [4] }],
      search: null,
      sort: [{ field: "cpu", direction: "desc" }],
      group: [],
    });
    const location = createMemoryLocation({ href: "/machines?tab=overview" });
    const release = createLocationBinding({
      host: provider,
      location,
    }).observe();
    expect(location.read().toString()).toBe(
      "tab=overview&cpu__gte=4&sort=cpu__desc&page=1&size=50",
    );
    expect(provider.state.get().slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
    release();
  });

  it("canonicalizes a respelled query on start without adopting it", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({
      href: "/machines?status=failed&status=failed",
    });
    const { host, adopt } = tracked(provider);
    const release = createLocationBinding({ host, location }).observe();
    expect(adopt).toHaveBeenCalledTimes(1);
    expect(location.read().getAll("status")).toEqual(["failed"]);
    release();
  });

  it("writes every accepted host transition to the location", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines" });
    const release = createLocationBinding({
      host: provider,
      location,
    }).observe();
    provider.fields.cpu.gte.edit("4");
    expect(location.read().get("cpu__gte")).toBe("4");
    provider.navigateWindow({ page: 3 });
    expect(location.read().get("page")).toBe("3");
    provider.setSearch("yak");
    expect(location.read().get("q")).toBe("yak");
    // A changed query resets the window, and the location says so.
    expect(location.read().get("page")).toBe("1");
    release();
  });

  it("carries the page's token through the location and back", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({
      href: "/machines?page=2&size=50&cursor=after-page-one",
    });
    const release = createLocationBinding({
      host: provider,
      location,
    }).observe();
    expect(provider.state.get().window).toEqual(
      windowAt({ page: 2, cursor: "after-page-one" }),
    );
    // Adopted verbatim, so a reload reaches the same page start.
    expect(location.read().toString()).toBe(
      "page=2&size=50&cursor=after-page-one",
    );

    provider.navigateWindow({ page: 3, cursor: "after-page-two" });
    expect(location.read().toString()).toBe(
      "page=3&size=50&cursor=after-page-two",
    );

    // Paging without a token leaves none behind to address the page.
    provider.navigateWindow({ page: 4 });
    expect(location.read().toString()).toBe("page=4&size=50");
    expect(provider.state.get().window.cursor).toBeNull();
    release();
  });

  it("writes a token that moves while the page number does not", () => {
    // The token alone decides which rows a page holds, so a page re-issued
    // against a different one is a different place, and the location has to
    // say so or a reload lands somewhere else.
    const provider = machinesProvider();
    const location = createMemoryLocation({
      href: "/machines?page=2&size=50&cursor=after-page-one",
    });
    const release = createLocationBinding({
      host: provider,
      location,
    }).observe();
    provider.navigateWindow({ page: 2, cursor: "after-page-one-again" });
    expect(location.read().toString()).toBe(
      "page=2&size=50&cursor=after-page-one-again",
    );
    release();
  });

  it("adopts a location whose token moved under an unchanged page", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({
      href: "/machines?page=2&size=50&cursor=after-page-one",
    });
    const { host, adopt } = tracked(provider);
    const release = createLocationBinding({ host, location }).observe();
    adopt.mockClear();
    location.write(new URLSearchParams("page=2&size=50&cursor=elsewhere"));
    expect(adopt).toHaveBeenCalledTimes(1);
    expect(provider.state.get().window.cursor).toBe("elsewhere");
    release();
  });

  it("does not adopt the echo of its own write", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines" });
    const { host, adopt } = tracked(provider);
    const release = createLocationBinding({ host, location }).observe();
    provider.fields.cpu.gte.edit("4");
    expect(location.read().get("cpu__gte")).toBe("4");
    expect(adopt).not.toHaveBeenCalled();
    // The live input session survives: nothing re-synced the input.
    expect(provider.fields.cpu.gte.state.get().input).toBe("4");
    release();
  });

  it("adopts an external location change", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines" });
    const release = createLocationBinding({
      host: provider,
      location,
    }).observe();
    provider.fields.cpu.gte.edit("4");
    location.write(new URLSearchParams("status=ready&page=2"));
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["ready"] },
    ]);
    expect(provider.state.get().window).toEqual(windowAt({ page: 2 }));
    // The authoritative query wins: the stale input session is discarded.
    expect(provider.fields.cpu.gte.state.get().input).toBe("");
    release();
  });

  it("replaces by default and pushes when asked", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation();
    const write = vi.spyOn(location, "write");
    const release = createLocationBinding({
      host: provider,
      location,
    }).observe();
    provider.navigateWindow({ page: 2 });
    expect(write).toHaveBeenLastCalledWith(expect.anything(), {
      history: "replace",
    });
    release();

    const pushing = createLocationBinding({
      host: provider,
      location,
      history: "push",
    }).observe();
    provider.navigateWindow({ page: 3 });
    expect(write).toHaveBeenLastCalledWith(expect.anything(), {
      history: "push",
    });
    pushing();
  });

  it("publishes the owned parameters it refused, and narrows nothing", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({
      href: "/machines?status=melted&cpu__near=4&tab=overview",
    });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    expect(binding.issues.get()).toEqual([
      { parameter: "status", reason: '"melted" is not an option of "status"' },
      { parameter: "cpu__near", reason: 'unknown operator "near"' },
    ]);
    expect(provider.state.get().slice.filter).toEqual([]);
    // The host's parameter survives the canonicalizing write.
    expect(location.read().get("tab")).toBe("overview");
    release();
  });

  it("leaves a refused parameter standing until the query moves", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines?status=melted" });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    // Not rewritten: a reload must show the same error, not a broader query.
    expect(location.read().toString()).toBe("status=melted");

    // A row completion is not a query change, so it does not rewrite either.
    const requestId = provider.refresh();
    expect(requestId).not.toBeNull();
    provider.complete(String(requestId), delivered([{ id: "a" }]));
    expect(location.read().toString()).toBe("status=melted");

    // Moving the query does: the user has replaced what was refused.
    provider.fields.status.eq.set(["ready"]);
    expect(location.read().toString()).toBe("status=ready&page=1&size=50");
    expect(binding.issues.get()).toEqual([]);
    release();
  });

  it("leaves a refused parameter standing when the location also moves", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({
      href: "/machines?status=melted&page=2",
    });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    // The adoption publishes, and that publication re-enters the write. It
    // must not rewrite the refusal away, nor the echo clear its report.
    expect(location.read().toString()).toBe("status=melted&page=2");
    expect(binding.issues.get()).toEqual([
      { parameter: "status", reason: '"melted" is not an option of "status"' },
    ]);
    expect(provider.state.get().window).toEqual(windowAt({ page: 2 }));
    release();
  });

  it("adopts an external change through every live observation", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines" });
    const binding = createLocationBinding({ host: provider, location });
    const first = binding.observe();
    const second = binding.observe();
    // Two observations share no listener registration: releasing one leaves
    // the other reading the location.
    first();
    location.write(new URLSearchParams("status=ready&page=1&size=50"));
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["ready"] },
    ]);
    second();
  });

  it("re-encodes nothing for a publication that does not move the query", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines" });
    const release = createLocationBinding({
      host: provider,
      location,
    }).observe();
    const read = vi.spyOn(location, "read");
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const requestId = provider.refresh();
      provider.complete(String(requestId), delivered([{ id: "a" }]));
    }
    expect(read).not.toHaveBeenCalled();
    // A query that does move is still written.
    provider.navigateWindow({ page: 2 });
    expect(location.read().get("page")).toBe("2");
    release();
  });

  it("notifies on a changed issue list and not on a restated one", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines?status=melted" });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    const seen = vi.fn();
    const stop = binding.issues.subscribe(seen);

    location.write(new URLSearchParams("status=melted&page=1&size=50"));
    expect(seen).not.toHaveBeenCalled();

    location.write(new URLSearchParams("status=liquid&page=1&size=50"));
    expect(seen).toHaveBeenCalledTimes(1);

    location.write(new URLSearchParams("cpu__near=4&page=1&size=50"));
    expect(seen).toHaveBeenCalledTimes(2);

    location.write(new URLSearchParams("page=1&size=50"));
    expect(binding.issues.get()).toEqual([]);
    expect(seen).toHaveBeenCalledTimes(3);
    stop();
    release();
  });

  it("keeps the host's repeated parameters and their order through the loop", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({
      href: "/machines?tab=a&status=failed&status=cancelled&tab=b",
    });
    const release = createLocationBinding({
      host: provider,
      location,
    }).observe();
    provider.navigateWindow({ page: 2 });
    expect(location.read().toString()).toBe(
      "tab=a&tab=b&status=cancelled&status=failed&page=2&size=50",
    );
    release();
  });

  it("owes a moved location a write when observed again", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines" });
    const binding = createLocationBinding({ host: provider, location });
    binding.observe()();
    const release = binding.observe();
    provider.navigateWindow({ page: 2 });
    release();
    location.write(new URLSearchParams("tab=x"));
    const again = binding.observe();
    expect(location.read().toString()).toBe("tab=x&page=2&size=50");
    again();
  });

  it("reports afresh when observed again", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({
      href: "/machines?status=failed&status=melted",
    });
    const binding = createLocationBinding({ host: provider, location });
    binding.observe()();
    location.write(new URLSearchParams("tab=x"));
    const release = binding.observe();
    expect(binding.issues.get()).toEqual([]);
    // Carrying no query, the location takes what the host holds.
    expect(location.read().toString()).toBe(
      "tab=x&status=failed&page=1&size=50",
    );
    release();
  });

  it("writes a return to the position it stood at before a refused link", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines" });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    location.write(new URLSearchParams("status=failed&status=melted"));
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed"] },
    ]);
    // Back where the binding last wrote — but the location has moved since,
    // so it is owed the write.
    provider.fields.status.eq.clear();
    expect(location.read().toString()).toBe("page=1&size=50");
    expect(binding.issues.get()).toEqual([]);
    release();
  });

  it("pushes only the host's transitions, never a seed or a respelling", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines" });
    const write = vi.spyOn(location, "write");
    const release = createLocationBinding({
      host: provider,
      location,
      history: "push",
    }).observe();
    expect(write).toHaveBeenLastCalledWith(expect.anything(), {
      history: "replace",
    });
    // Back to an entry spelled another way: canonicalized in place.
    location.write(new URLSearchParams("status=ready"));
    expect(write).toHaveBeenLastCalledWith(expect.anything(), {
      history: "replace",
    });
    expect(location.read().toString()).toBe("status=ready&page=1&size=50");
    provider.navigateWindow({ page: 2 });
    expect(write).toHaveBeenLastCalledWith(expect.anything(), {
      history: "push",
    });
    release();
  });

  it("clears its report on writing, whether or not the location echoes", () => {
    const provider = machinesProvider();
    const memory = createMemoryLocation({ href: "/machines?status=melted" });
    // A location that never notifies: the binding hears no echo.
    const location = { ...memory, subscribe: () => () => {} };
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    expect(binding.issues.get()).toEqual([
      { parameter: "status", reason: '"melted" is not an option of "status"' },
    ]);
    provider.fields.status.eq.set(["ready"]);
    expect(location.read().toString()).toBe("status=ready&page=1&size=50");
    expect(binding.issues.get()).toEqual([]);
    release();
  });

  it("refuses a clause the host's source cannot execute rather than adopting it", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: declareCapabilities({
        filter: { status: ["eq"], cpu: ["lte"] },
      }),
    });
    const location = createMemoryLocation({
      href: "/machines?status=ready&cpu__gte=4&sort=cpu__asc",
    });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    expect(provider.state.get().slice).toEqual({
      filter: [{ field: "status", operator: "eq", operands: ["ready"] }],
      search: null,
      sort: [],
      group: [],
    });
    expect(binding.issues.get()).toEqual([
      {
        parameter: "cpu__gte",
        reason: 'field "cpu" cannot be filtered with gte',
      },
      { parameter: "sort", reason: "this source cannot sort" },
    ]);
    // Standing, like any refusal, until the query moves.
    expect(location.read().toString()).toBe(
      "status=ready&cpu__gte=4&sort=cpu__asc",
    );
    release();
  });

  it("refuses a sort its source cannot execute arriving in the location, and answers the rest", () => {
    const source = createArraySource({ rows: fleet, fields: ["status"] });
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: source.capabilities,
    });
    const stopSource = createSourceBinding({
      host: provider,
      source,
    }).observe();
    const location = createMemoryLocation({
      href: "/machines?status=failed&sort=cpu__asc",
    });
    const loop = createLocationBinding({ host: provider, location });
    const release = loop.observe();
    expect(loop.issues.get()).toEqual([
      { parameter: "sort", reason: 'field "cpu" cannot be sorted' },
    ]);
    const state = provider.state.get();
    expect(state.slice.sort).toEqual([]);
    expect(state.result.status).toBe("ready");
    expect(state.resultMatchesQuery).toBe(true);
    expect(state.result.rows).toHaveLength(2);
    // The refused parameter stands, so the refusal survives a reload.
    expect(location.read().toString()).toBe("status=failed&sort=cpu__asc");
    release();
    stopSource();
  });

  it("shows rows a refused location sort could not replace as stale, and recovers on the way back", () => {
    const source = createArraySource({ rows: fleet, fields: ["status"] });
    // Not told the source's capabilities, so the location's sort is adopted
    // and it is the source that refuses it.
    const provider = machinesProvider();
    const stopSource = createSourceBinding({
      host: provider,
      source,
    }).observe();
    const location = createMemoryLocation({ href: "/machines?status=failed" });
    const release = createLocationBinding({
      host: provider,
      location,
    }).observe();
    expect(provider.state.get().result.status).toBe("ready");

    location.write(new URLSearchParams("status=ready&sort=cpu__asc"));
    const refused = provider.state.get();
    expect(refused.slice.sort).toEqual([{ field: "cpu", direction: "asc" }]);
    expect(refused.result.status).toBe("stale");
    expect(refused.resultMatchesQuery).toBe(false);
    expect(refused.result.rows).toHaveLength(2);
    expect(refused.result.problem).toEqual({
      status: "refused",
      refusals: [
        {
          part: "sort",
          code: "undeclared-field",
          field: "cpu",
          operator: null,
          reason: 'field "cpu" cannot be sorted',
        },
      ],
    });

    location.write(new URLSearchParams("status=ready"));
    const recovered = provider.state.get();
    expect(recovered.result.status).toBe("ready");
    expect(recovered.resultMatchesQuery).toBe(true);
    expect(recovered.result.rows).toHaveLength(3);
    release();
    stopSource();
  });

  it("retries a write the location threw on at the next publication", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines" });
    const release = createLocationBinding({
      host: provider,
      location,
    }).observe();
    const write = vi.spyOn(location, "write").mockImplementationOnce(() => {
      throw new Error("history refused");
    });
    expect(() => provider.navigateWindow({ page: 2 })).toThrow(
      "history refused",
    );
    expect(location.read().get("page")).toBe("1");
    provider.refresh();
    expect(write).toHaveBeenCalledTimes(2);
    expect(location.read().get("page")).toBe("2");
    release();
  });

  it("writes and adopts a change of page size alone", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines" });
    const release = createLocationBinding({
      host: provider,
      location,
    }).observe();
    provider.navigateWindow({ page: 1, size: 25 });
    expect(location.read().toString()).toBe("page=1&size=25");
    location.write(new URLSearchParams("page=1&size=10"));
    expect(provider.state.get().window).toEqual(windowAt({ size: 10 }));
    release();
  });

  it("notifies when only the refused parameter changes", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines?page=0" });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    const seen = vi.fn();
    const stop = binding.issues.subscribe(seen);
    location.write(new URLSearchParams("size=0"));
    expect(seen).toHaveBeenCalledTimes(1);
    expect(binding.issues.get()).toEqual([
      { parameter: "size", reason: '"0" is not a positive integer' },
    ]);
    stop();
    release();
  });

  it("keeps a refusal its own write provoked, under a location that echoes at once", () => {
    // A host transition the source cannot execute: the write echoes
    // synchronously, the echo refuses it, and that refusal must stand
    // rather than be overwritten by the write that provoked it.
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: NOTHING_DECLARED,
    });
    const location = createMemoryLocation({ href: "/machines" });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    provider.setSearch("abc");
    expect(binding.issues.get()).toEqual([
      { parameter: "q", reason: "this source cannot search" },
    ]);
    expect(provider.state.get().slice.search).toBeNull();
    // Standing: a publication at the adopted position rewrites nothing.
    provider.refresh();
    expect(location.read().toString()).toBe("q=abc&page=1&size=50");
    release();
  });

  it("refuses an unexecutable clause again when the host re-applies it", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: NOTHING_DECLARED,
    });
    const location = createMemoryLocation({
      href: "/machines?q=abc&page=1&size=50",
    });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    expect(provider.state.get().slice.search).toBeNull();
    // The encode matches what the location already says, so nothing is
    // written and nothing echoes — the refusal must still hold.
    provider.setSearch("abc");
    expect(binding.issues.get()).toEqual([
      { parameter: "q", reason: "this source cannot search" },
    ]);
    expect(provider.state.get().slice.search).toBeNull();
    expect(location.read().toString()).toBe("q=abc&page=1&size=50");
    release();
  });

  it("keeps a refusal when a listener throws after the write landed", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: NOTHING_DECLARED,
    });
    const location = createMemoryLocation({ href: "/machines" });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    let thrown = false;
    const stop = location.subscribe(() => {
      if (!thrown) {
        thrown = true;
        throw new Error("listener failed");
      }
    });
    expect(() => provider.setSearch("abc")).toThrow("listener failed");
    expect(binding.issues.get()).toEqual([
      { parameter: "q", reason: "this source cannot search" },
    ]);
    // Written, so not retried: the refused link stands.
    provider.refresh();
    expect(location.read().toString()).toBe("q=abc&page=1&size=50");
    stop();
    release();
  });

  it("keeps a refusal when a listener that threw first never let it echo", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: NOTHING_DECLARED,
    });
    const location = createMemoryLocation({ href: "/machines" });
    // Subscribed before the binding, so its throw stops the location before
    // the binding's own listener hears the write.
    let armed = false;
    const stop = location.subscribe(() => {
      if (armed) {
        armed = false;
        throw new Error("listener failed");
      }
    });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    armed = true;
    expect(() => provider.setSearch("abc")).toThrow("listener failed");
    expect(binding.issues.get()).toEqual([
      { parameter: "q", reason: "this source cannot search" },
    ]);
    expect(provider.state.get().slice.search).toBeNull();
    stop();
    release();
  });

  it("writes a host move made while the location was being read back", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: NOTHING_DECLARED,
    });
    const location = createMemoryLocation({
      href: "/machines?q=abc&page=1&size=50",
    });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    provider.setSearch("abc");
    // Refused again by the read-back — and, reacting to that, something
    // else pages on. That move is the user's, not the read-back's.
    const stop = provider.state.subscribe(() => {
      const { slice, window } = provider.state.get();
      if (slice.search === null && window.page === 1) {
        provider.navigateWindow({ page: 2 });
      }
    });
    provider.setSearch("abc");
    expect(provider.state.get().window.page).toBe(2);
    expect(location.read().toString()).toBe("page=2&size=50");
    stop();
    release();
  });

  it("canonicalizes a location respelled while it was being read back", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: NOTHING_DECLARED,
    });
    const location = createMemoryLocation({
      href: "/machines?q=abc&page=1&size=50",
    });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    provider.setSearch("abc");
    let respelled = false;
    const stop = provider.state.subscribe(() => {
      if (!respelled && provider.state.get().slice.search === null) {
        respelled = true;
        location.write(new URLSearchParams("page=007&size=50"));
      }
    });
    provider.setSearch("abc");
    expect(provider.state.get().window.page).toBe(7);
    expect(location.read().toString()).toBe("page=7&size=50");
    stop();
    release();
  });

  it("owes a read-back respelling a replace, even in push mode", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: NOTHING_DECLARED,
    });
    const { memory, location, writes } = recording(
      "/machines?q=abc&page=1&size=50",
    );
    const binding = createLocationBinding({
      host: provider,
      location,
      history: "push",
    });
    const release = binding.observe();
    provider.setSearch("abc");
    let step = 0;
    const stop = provider.state.subscribe(() => {
      const { slice } = provider.state.get();
      if (step === 0 && slice.search === null) {
        step = 1;
        memory.write(new URLSearchParams("page=007&size=50"));
      }
    });
    writes.length = 0;
    provider.setSearch("abc");
    expect(writes.at(-1)).toEqual(["page=7&size=50", "replace"]);
    stop();
    release();
  });

  it("owes a host move made during a read-back the transition's push", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: NOTHING_DECLARED,
    });
    const { location, writes } = recording("/machines?q=abc&page=1&size=50");
    const release = createLocationBinding({
      host: provider,
      location,
      history: "push",
    }).observe();
    provider.setSearch("abc");
    const pager = provider.state.subscribe(() => {
      const { slice, window } = provider.state.get();
      if (slice.search === null && window.page === 1) {
        provider.navigateWindow({ page: 2 });
      }
    });
    writes.length = 0;
    provider.setSearch("abc");
    expect(writes).toEqual([["page=2&size=50", "push"]]);
    pager();
    release();
  });

  it("lets a genuine move after a respelling in one read-back push", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: NOTHING_DECLARED,
    });
    const { memory, location, writes } = recording(
      "/machines?q=abc&page=1&size=50",
    );
    const binding = createLocationBinding({
      host: provider,
      location,
      history: "push",
    });
    const release = binding.observe();
    provider.setSearch("abc");
    let respelled = false;
    const respell = provider.state.subscribe(() => {
      if (!respelled && provider.state.get().slice.search === null) {
        respelled = true;
        memory.write(new URLSearchParams("page=007&size=50"));
      }
    });
    // Subscribed after the binding: it moves once the respelling is adopted.
    const mover = location.subscribe(() => {
      if (provider.state.get().window.page === 7) {
        provider.navigateWindow({ page: 8 });
      }
    });
    writes.length = 0;
    provider.setSearch("abc");
    // The last reason decides: the move is the user's step, so it pushes.
    expect(writes).toEqual([["page=8&size=50", "push"]]);
    mover();
    respell();
    release();
  });

  it("keeps a read-back respelling a replace when the host republishes in place", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: NOTHING_DECLARED,
    });
    const { memory, location, writes } = recording(
      "/machines?q=abc&page=1&size=50",
    );
    const binding = createLocationBinding({
      host: provider,
      location,
      history: "push",
    });
    const release = binding.observe();
    provider.setSearch("abc");
    let respelled = false;
    const respell = provider.state.subscribe(() => {
      if (!respelled && provider.state.get().slice.search === null) {
        respelled = true;
        memory.write(new URLSearchParams("page=007&size=50"));
      }
    });
    // Publishes without moving once the respelling is adopted.
    let refreshed = false;
    const republish = location.subscribe(() => {
      if (!refreshed && provider.state.get().window.page === 7) {
        refreshed = true;
        provider.refresh();
      }
    });
    writes.length = 0;
    provider.setSearch("abc");
    expect(writes).toEqual([["page=7&size=50", "replace"]]);
    republish();
    respell();
    release();
  });

  it("keeps writing after a listener throws during a read-back", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: NOTHING_DECLARED,
    });
    const location = createMemoryLocation({
      href: "/machines?q=abc&page=1&size=50",
    });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    provider.setSearch("abc");
    let armed = true;
    const stop = provider.state.subscribe(() => {
      if (armed && provider.state.get().slice.search === null) {
        armed = false;
        throw new Error("listener failed");
      }
    });
    expect(() => provider.setSearch("abc")).toThrow("listener failed");
    stop();
    provider.navigateWindow({ page: 3 });
    expect(location.read().get("page")).toBe("3");
    release();
  });

  it("reads back once for a host that publishes on adopt without moving", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: NOTHING_DECLARED,
    });
    // Breaks the adopt contract: it publishes and stays where it was.
    const host: LocationHost = {
      schema: provider.schema,
      state: provider.state,
      capabilities: provider.capabilities,
      adopt: () => {
        provider.refresh();
      },
    };
    const location = createMemoryLocation({
      href: "/machines?q=abc&page=1&size=50",
    });
    const binding = createLocationBinding({ host, location });
    const release = binding.observe();
    const reads = vi.spyOn(location, "read");
    const writes = vi.spyOn(location, "write");
    provider.setSearch("abc");
    // Once, and it terminates: a host that publishes on adopt without
    // moving would otherwise bring the read-back straight back here, and
    // the refused clause is left standing rather than rewritten away.
    expect(reads).toHaveBeenCalledTimes(1);
    expect(writes).not.toHaveBeenCalled();
    expect(binding.issues.get()).toEqual([
      { parameter: "q", reason: "this source cannot search" },
    ]);
    reads.mockRestore();
    writes.mockRestore();
    release();
  });

  it("refuses a seed its host's source cannot execute, and says so", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      slice: {
        filter: [{ field: "status", operator: "eq", operands: ["failed"] }],
        search: null,
        sort: [],
        group: [],
      },
      capabilities: NOTHING_DECLARED,
    });
    const location = createMemoryLocation({ href: "/machines" });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    expect(binding.issues.get()).toEqual([
      {
        parameter: "status",
        reason: 'field "status" cannot be filtered',
      },
    ]);
    expect(provider.state.get().slice.filter).toEqual([]);
    expect(location.read().toString()).toBe("status=failed&page=1&size=50");
    release();
  });

  it("releases both directions, and releases once", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines" });
    const { host, adopt } = tracked(provider);
    const release = createLocationBinding({ host, location }).observe();
    release();
    release();

    provider.navigateWindow({ page: 4 });
    expect(location.read().get("page")).toBe("1");
    location.write(new URLSearchParams("status=ready"));
    expect(adopt).not.toHaveBeenCalled();
  });

  it("survives a double observe and releases each independently", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines" });
    const binding = createLocationBinding({ host: provider, location });
    const first = binding.observe();
    const second = binding.observe();
    first();

    provider.navigateWindow({ page: 2 });
    expect(location.read().get("page")).toBe("2");
    second();
    provider.navigateWindow({ page: 3 });
    expect(location.read().get("page")).toBe("2");
  });

  it("detaches when the host is disposed", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines" });
    const { host, adopt } = tracked(provider);
    createLocationBinding({ host, location }).observe();
    provider.dispose();
    location.write(new URLSearchParams("status=ready"));
    expect(adopt).not.toHaveBeenCalled();
  });

  it("observes nothing on an already disposed host", () => {
    const provider = machinesProvider();
    provider.dispose();
    const location = createMemoryLocation({ href: "/machines?tab=overview" });
    const { host, adopt } = tracked(provider);
    const release = createLocationBinding({ host, location }).observe();
    expect(location.read().toString()).toBe("tab=overview");
    location.write(new URLSearchParams("status=ready"));
    expect(adopt).not.toHaveBeenCalled();
    release();
  });
});
