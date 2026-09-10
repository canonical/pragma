/**
 * The provider/Location authority loop. Mutation-tested: each expectation
 * fails if a direction of the loop, its echo guard or its release is
 * dropped.
 */

import { describe, expect, it, vi } from "vitest";
import createDataViewsProvider from "../provider/createDataViewsProvider.js";
import type { ResultWindow, Slice } from "../query/types.js";
import createSchema from "../schema/createSchema.js";
import type { SourceCapabilities } from "../source/types.js";
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
  const adopt = vi.fn((slice: Slice, window: ResultWindow): string | null =>
    provider.adopt(slice, window),
  );
  const host: LocationHost = {
    schema: provider.schema,
    result: provider.result,
    capabilities: provider.capabilities,
    adopt,
  };
  return { host, adopt };
};

/** A source that can execute no filter, search, sort or grouping. */
const declaresNothing: SourceCapabilities = {
  filter: {},
  search: [],
  sort: [],
  sortTerms: 0,
  group: [],
  count: "filtered",
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

const machinesProvider = (slice?: Slice, window?: ResultWindow) =>
  createDataViewsProvider({ schema: machines(), slice, window });

describe("createLocationBinding", () => {
  it("subscribes to nothing until it is observed", () => {
    const provider = machinesProvider();
    const location = createMemoryLocation({ href: "/machines?status=failed" });
    createLocationBinding({ host: provider, location });
    expect(provider.result.get().slice.filter).toEqual([]);
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
    expect(provider.result.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed", "cancelled"] },
    ]);
    expect(provider.result.get().window).toEqual({ page: 2, size: 50 });
    release();
  });

  it("writes the host's seed to a location carrying no query", () => {
    const provider = machinesProvider({
      filter: [{ field: "cpu", operator: "gte", operands: [4] }],
      search: null,
      sort: [{ field: "cpu", direction: "desc" }],
      group: null,
    });
    const location = createMemoryLocation({ href: "/machines?tab=overview" });
    const release = createLocationBinding({
      host: provider,
      location,
    }).observe();
    expect(location.read().toString()).toBe(
      "tab=overview&cpu__gte=4&sort=cpu__desc&page=1&size=50",
    );
    expect(provider.result.get().slice.filter).toEqual([
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
    provider.navigateWindow(3);
    expect(location.read().get("page")).toBe("3");
    provider.setSearch("yak");
    expect(location.read().get("q")).toBe("yak");
    // A changed query resets the window, and the location says so.
    expect(location.read().get("page")).toBe("1");
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
    // The live input session survives: nothing re-synced the buffer.
    expect(provider.fields.cpu.gte.state.get().buffer).toBe("4");
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
    expect(provider.result.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["ready"] },
    ]);
    expect(provider.result.get().window).toEqual({ page: 2, size: 50 });
    // The authoritative query wins: the stale input session is discarded.
    expect(provider.fields.cpu.gte.state.get().buffer).toBe("");
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
    provider.navigateWindow(2);
    expect(write).toHaveBeenLastCalledWith(expect.anything(), {
      history: "replace",
    });
    release();

    const pushing = createLocationBinding({
      host: provider,
      location,
      history: "push",
    }).observe();
    provider.navigateWindow(3);
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
    expect(provider.result.get().slice.filter).toEqual([]);
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
    provider.complete(String(requestId), {
      status: "success",
      rows: [{ id: "a" }],
      count: 1,
    });
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
    expect(provider.result.get().window).toEqual({ page: 2, size: 50 });
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
    expect(provider.result.get().slice.filter).toEqual([
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
      provider.complete(String(requestId), {
        status: "success",
        rows: [{ id: "a" }],
        count: 1,
      });
    }
    expect(read).not.toHaveBeenCalled();
    // A query that does move is still written.
    provider.navigateWindow(2);
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
    provider.navigateWindow(2);
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
    provider.navigateWindow(2);
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
    expect(provider.result.get().slice.filter).toEqual([
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
    provider.navigateWindow(2);
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
      capabilities: {
        filter: { status: ["eq"] },
        search: [],
        sort: [],
        sortTerms: 0,
        group: [],
        count: "filtered",
      },
    });
    const location = createMemoryLocation({
      href: "/machines?status=ready&cpu__gte=4&sort=cpu__asc",
    });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    expect(provider.result.get().slice).toEqual({
      filter: [{ field: "status", operator: "eq", operands: ["ready"] }],
      search: null,
      sort: [],
      group: null,
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
    expect(() => provider.navigateWindow(2)).toThrow("history refused");
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
    provider.navigateWindow(1, 25);
    expect(location.read().toString()).toBe("page=1&size=25");
    location.write(new URLSearchParams("page=1&size=10"));
    expect(provider.result.get().window).toEqual({ page: 1, size: 10 });
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
      capabilities: declaresNothing,
    });
    const location = createMemoryLocation({ href: "/machines" });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    provider.setSearch("abc");
    expect(binding.issues.get()).toEqual([
      { parameter: "q", reason: "this source cannot search" },
    ]);
    expect(provider.result.get().slice.search).toBeNull();
    // Standing: a publication at the adopted position rewrites nothing.
    provider.refresh();
    expect(location.read().toString()).toBe("q=abc&page=1&size=50");
    release();
  });

  it("refuses an unexecutable clause again when the host re-applies it", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: declaresNothing,
    });
    const location = createMemoryLocation({
      href: "/machines?q=abc&page=1&size=50",
    });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    expect(provider.result.get().slice.search).toBeNull();
    // The encode matches what the location already says, so nothing is
    // written and nothing echoes — the refusal must still hold.
    provider.setSearch("abc");
    expect(binding.issues.get()).toEqual([
      { parameter: "q", reason: "this source cannot search" },
    ]);
    expect(provider.result.get().slice.search).toBeNull();
    expect(location.read().toString()).toBe("q=abc&page=1&size=50");
    release();
  });

  it("keeps a refusal when a listener throws after the write landed", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: declaresNothing,
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
      capabilities: declaresNothing,
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
    expect(provider.result.get().slice.search).toBeNull();
    stop();
    release();
  });

  it("writes a host move made while the location was being read back", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: declaresNothing,
    });
    const location = createMemoryLocation({
      href: "/machines?q=abc&page=1&size=50",
    });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    provider.setSearch("abc");
    // Refused again by the read-back — and, reacting to that, something
    // else pages on. That move is the user's, not the read-back's.
    const stop = provider.result.subscribe(() => {
      const { slice, window } = provider.result.get();
      if (slice.search === null && window.page === 1) {
        provider.navigateWindow(2);
      }
    });
    provider.setSearch("abc");
    expect(provider.result.get().window.page).toBe(2);
    expect(location.read().toString()).toBe("page=2&size=50");
    stop();
    release();
  });

  it("canonicalizes a location respelled while it was being read back", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: declaresNothing,
    });
    const location = createMemoryLocation({
      href: "/machines?q=abc&page=1&size=50",
    });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    provider.setSearch("abc");
    let respelled = false;
    const stop = provider.result.subscribe(() => {
      if (!respelled && provider.result.get().slice.search === null) {
        respelled = true;
        location.write(new URLSearchParams("page=007&size=50"));
      }
    });
    provider.setSearch("abc");
    expect(provider.result.get().window.page).toBe(7);
    expect(location.read().toString()).toBe("page=7&size=50");
    stop();
    release();
  });

  it("owes a read-back respelling a replace, even in push mode", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: declaresNothing,
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
    const stop = provider.result.subscribe(() => {
      const { slice } = provider.result.get();
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
      capabilities: declaresNothing,
    });
    const { location, writes } = recording("/machines?q=abc&page=1&size=50");
    const release = createLocationBinding({
      host: provider,
      location,
      history: "push",
    }).observe();
    provider.setSearch("abc");
    const pager = provider.result.subscribe(() => {
      const { slice, window } = provider.result.get();
      if (slice.search === null && window.page === 1) {
        provider.navigateWindow(2);
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
      capabilities: declaresNothing,
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
    const respell = provider.result.subscribe(() => {
      if (!respelled && provider.result.get().slice.search === null) {
        respelled = true;
        memory.write(new URLSearchParams("page=007&size=50"));
      }
    });
    // Subscribed after the binding: it moves once the respelling is adopted.
    const mover = location.subscribe(() => {
      if (provider.result.get().window.page === 7) {
        provider.navigateWindow(8);
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
      capabilities: declaresNothing,
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
    const respell = provider.result.subscribe(() => {
      if (!respelled && provider.result.get().slice.search === null) {
        respelled = true;
        memory.write(new URLSearchParams("page=007&size=50"));
      }
    });
    // Publishes without moving once the respelling is adopted.
    let refreshed = false;
    const republish = location.subscribe(() => {
      if (!refreshed && provider.result.get().window.page === 7) {
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
      capabilities: declaresNothing,
    });
    const location = createMemoryLocation({
      href: "/machines?q=abc&page=1&size=50",
    });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    provider.setSearch("abc");
    let armed = true;
    const stop = provider.result.subscribe(() => {
      if (armed && provider.result.get().slice.search === null) {
        armed = false;
        throw new Error("listener failed");
      }
    });
    expect(() => provider.setSearch("abc")).toThrow("listener failed");
    stop();
    provider.navigateWindow(3);
    expect(location.read().get("page")).toBe("3");
    release();
  });

  it("reads back once for a host that publishes on adopt without moving", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      capabilities: declaresNothing,
    });
    // Breaks the adopt contract: it publishes and stays where it was.
    const host: LocationHost = {
      schema: provider.schema,
      result: provider.result,
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
    expect(() => provider.setSearch("abc")).not.toThrow();
    expect(binding.issues.get()).toEqual([
      { parameter: "q", reason: "this source cannot search" },
    ]);
    release();
  });

  it("refuses a seed its host's source cannot execute, and says so", () => {
    const provider = createDataViewsProvider({
      schema: machines(),
      slice: {
        filter: [{ field: "status", operator: "eq", operands: ["failed"] }],
        search: null,
        sort: [],
        group: null,
      },
      capabilities: declaresNothing,
    });
    const location = createMemoryLocation({ href: "/machines" });
    const binding = createLocationBinding({ host: provider, location });
    const release = binding.observe();
    expect(binding.issues.get()).toEqual([
      {
        parameter: "status",
        reason: 'field "status" cannot be filtered with eq',
      },
    ]);
    expect(provider.result.get().slice.filter).toEqual([]);
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

    provider.navigateWindow(4);
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

    provider.navigateWindow(2);
    expect(location.read().get("page")).toBe("2");
    second();
    provider.navigateWindow(3);
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
