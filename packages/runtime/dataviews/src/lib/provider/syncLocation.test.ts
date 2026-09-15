/**
 * The host/location authority loop. Mutation-tested: each expectation
 * fails if a direction of the loop, its echo guard or its release is
 * dropped.
 *
 * The loop is built directly over the provider's host, so nothing else of
 * the provider — the source run, the first request — starts with it; the
 * scenarios that need a source run start one themselves, and one scenario
 * observes the provider whole to pin the order its ports start in.
 */

import { describe, expect, it, vi } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import createRecordingLocation from "../../../testing/createRecordingLocation.js";
import {
  byId,
  declare,
  declareSort,
  NOTHING_DECLARED,
  pageOf,
} from "../../../testing/fixtures.js";
import { createCollection } from "../collection/index.js";
import { createFilterInputs } from "../filter/index.js";
import { createMemoryLocation, type QueryLocation } from "../location/index.js";
import {
  DEFAULT_WINDOW,
  type ResultWindow,
  type Slice,
} from "../query/index.js";
import type { Completion, SourceRefusal } from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import type { SchemaFieldDefinition } from "../schema/index.js";
import {
  createArraySource,
  type Source,
  type SourceCapabilities,
} from "../source/index.js";
import createDataViewsProvider from "./createDataViewsProvider.js";
import readProviderHost from "./readProviderHost.js";
import runSource from "./runSource.js";
import syncLocation from "./syncLocation.js";
import type { HistoryPolicy, ProviderHost } from "./types.js";

const machines = createCollection({
  fields: [
    {
      field: "status",
      kind: "choices",
      options: ["failed", "cancelled", "ready"],
    },
    { field: "cpu", kind: "number", min: 0, max: 64 },
    { field: "owner", kind: "flag" },
  ],
  identify: byId,
});

/** The machines without their cpu: a source over it cannot order by one. */
const machinesWithoutCpu = createCollection({
  fields: machines.schema.fields.filter((field) => field.field !== "cpu"),
  identify: byId,
});

/** Everything the scenarios command: every filter, search, a two-field ordering. */
const permissive: SourceCapabilities = declare({
  filter: { status: ["isAny"], cpu: ["gte", "lte"], owner: ["isSet"] },
  search: { fields: ["name"] },
  sort: declareSort(["cpu", "status"]),
});

/** A source reaching its pages by token, and declaring nothing else. */
const byToken: SourceCapabilities = declare({
  pagination: { kind: "cursor", backward: false, durable: true },
});

/** The refusal a source gives an ordering by cpu it did not declare. */
const CPU_UNSORTABLE: SourceRefusal = {
  part: "sort",
  code: "undeclared-field",
  field: "cpu",
  operator: null,
  reason: 'field "cpu" cannot be sorted',
};

/** The issue a location's `q` earns from a source declaring no search. */
const SEARCH_REFUSED = {
  parameter: "q",
  code: "undeclared-field",
  reason: "this source cannot search",
};

/** The issue a `status` value outside the options earns. */
const MELTED = {
  parameter: "status",
  code: "invalid",
  reason: '"melted" is not an option of "status"',
};

/** Two failed machines and three ready ones, for a source to execute over. */
const fleet: readonly RowRecord[] = [
  { id: "m1", status: "failed", cpu: 4 },
  { id: "m2", status: "ready", cpu: 2 },
  { id: "m3", status: "ready", cpu: 8 },
  { id: "m4", status: "failed", cpu: 1 },
  { id: "m5", status: "ready", cpu: 16 },
];

/** One exactly counted page of rows, as a source delivers it. */
const delivered = (rows: readonly RowRecord[]): Completion => ({
  status: "succeeded",
  page: pageOf(rows),
});

/**
 * A manual source of the given declaration. It refuses nothing of its
 * own, which a cursor declaration requires it to say.
 */
const sourceOf = (capabilities: SourceCapabilities = permissive) =>
  createManualSource({ capabilities, refusals: () => [] });

/** A provider over the machines, started from `query` when one is given. */
const createMachinesProvider = (
  capabilities: SourceCapabilities = permissive,
  query?: string,
  history?: HistoryPolicy,
) =>
  createDataViewsProvider({
    collection: machines,
    source: sourceOf(capabilities).source,
    ...(query === undefined ? {} : { snapshot: { query, presentation: {} } }),
    ...(history === undefined ? {} : { history }),
  });

type SetUp = {
  readonly href?: string | undefined;
  readonly location?: QueryLocation | undefined;
  readonly capabilities?: SourceCapabilities | undefined;
  /** The query the provider starts from, as a snapshot carries it. */
  readonly query?: string | undefined;
  readonly history?: HistoryPolicy | undefined;
};

/**
 * A provider, its host, a location and the loop over the two — built,
 * never observed. The loop alone is under test: nothing else of the
 * provider starts.
 */
const setUp = (options: SetUp = {}) => {
  const provider = createMachinesProvider(
    options.capabilities,
    options.query,
    options.history,
  );
  const host = readProviderHost(provider);
  const location =
    options.location ?? createMemoryLocation({ href: options.href ?? "/" });
  const sync = syncLocation({ host, location, keepsViews: true, issues: [] });
  return { provider, host, location, sync };
};

/** The host behind a counting adopt: adoptions are the observable here. */
const spyAdopt = <TFields extends readonly SchemaFieldDefinition[]>(
  host: ProviderHost<TFields>,
) => {
  const adopt = vi.fn(host.adopt);
  return { host: { ...host, adopt }, adopt };
};

/**
 * Move the host to a search the way a saved view does: through adopt,
 * which the boundary does not check. A search the source cannot execute
 * then reaches the location, where the loop's own reading refuses it.
 */
const adoptSearch = (
  host: Pick<ProviderHost, "state" | "adopt">,
  search: string,
): void => {
  const { slice, window } = host.state.get();
  host.adopt({ slice: { ...slice, search }, window }, "view", null);
};

/** A recording port over the given href. */
const recording = (href: string) => createRecordingLocation({ href });

const windowAt = (overrides: Partial<ResultWindow> = {}): ResultWindow => ({
  ...DEFAULT_WINDOW,
  ...overrides,
});

describe("syncLocation", () => {
  it("subscribes to nothing until it is observed", () => {
    const { provider, location } = setUp({ href: "/machines?status=failed" });
    expect(provider.state.get().slice.filter).toEqual([]);
    expect(location.read().toString()).toBe("status=failed");
  });

  it("takes the location's query when it carries one", () => {
    const { provider, sync } = setUp({
      href: "/machines?status=failed&status=cancelled&page=2",
    });
    const release = sync.observe();
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["failed", "cancelled"] },
    ]);
    expect(provider.state.get().window).toEqual(windowAt({ page: 2 }));
    release();
  });

  it("writes the snapshot's query to a location carrying no query", () => {
    const { provider, location, sync } = setUp({
      href: "/machines?tab=overview",
      query: "cpu__gte=4&sort=cpu__desc",
    });
    const release = sync.observe();
    expect(location.read().toString()).toBe(
      "tab=overview&cpu__gte=4&sort=cpu__desc&page=1&size=50",
    );
    expect(provider.state.get().slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
    release();
  });

  it("canonicalizes a respelled query on start without adopting it", () => {
    const provider = createMachinesProvider();
    const location = createMemoryLocation({
      href: "/machines?status=failed&status=failed",
    });
    const { host, adopt } = spyAdopt(readProviderHost(provider));
    const release = syncLocation({
      host,
      location,
      keepsViews: true,
      issues: [],
    }).observe();
    // Once, for the query the location carried; the respelling is not a
    // second adoption.
    expect(adopt).toHaveBeenCalledTimes(1);
    expect(location.read().getAll("status")).toEqual(["failed"]);
    release();
  });

  it("writes every accepted host transition to the location", () => {
    const { provider, host, location, sync } = setUp({ href: "/machines" });
    const release = sync.observe();
    createFilterInputs({ host }).handles.cpu.gte.edit("4");
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
    const { provider, location, sync } = setUp({
      href: "/machines?page=2&size=50&cursor=after-page-one",
      capabilities: byToken,
    });
    const release = sync.observe();
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
    const { provider, location, sync } = setUp({
      href: "/machines?page=2&size=50&cursor=after-page-one",
      capabilities: byToken,
    });
    const release = sync.observe();
    provider.navigateWindow({ page: 2, cursor: "after-page-one-again" });
    expect(location.read().toString()).toBe(
      "page=2&size=50&cursor=after-page-one-again",
    );
    release();
  });

  it("adopts a location whose token moved under an unchanged page", () => {
    const provider = createMachinesProvider(byToken);
    const location = createMemoryLocation({
      href: "/machines?page=2&size=50&cursor=after-page-one",
    });
    const { host, adopt } = spyAdopt(readProviderHost(provider));
    const release = syncLocation({
      host,
      location,
      keepsViews: true,
      issues: [],
    }).observe();
    adopt.mockClear();
    location.write(new URLSearchParams("page=2&size=50&cursor=elsewhere"));
    expect(adopt).toHaveBeenCalledTimes(1);
    expect(provider.state.get().window.cursor).toBe("elsewhere");
    release();
  });

  it("does not adopt the echo of its own write", () => {
    const provider = createMachinesProvider();
    const location = createMemoryLocation({ href: "/machines" });
    const host = readProviderHost(provider);
    const watched = spyAdopt(host);
    const release = syncLocation({
      host: watched.host,
      location,
      keepsViews: true,
      issues: [],
    }).observe();
    const inputs = createFilterInputs({ host });
    const stopInputs = inputs.observe();
    inputs.handles.cpu.gte.edit("4");
    expect(location.read().get("cpu__gte")).toBe("4");
    expect(watched.adopt).not.toHaveBeenCalled();
    // The live input session survives: nothing re-synced the input.
    expect(inputs.handles.cpu.gte.state.get().input).toBe("4");
    stopInputs();
    release();
  });

  it("reads a written spelling back once, and not again as its echo", () => {
    // The read-back is the transition's; the location's notification of the
    // very spelling written is the loop's own echo and stops before reading
    // anything — one comparison of the host's state per transition, not two.
    const provider = createMachinesProvider();
    const host = readProviderHost(provider);
    const read = vi.fn(host.state.get);
    const watched: typeof host = {
      ...host,
      state: { get: read, subscribe: host.state.subscribe },
    };
    const location = createMemoryLocation({ href: "/machines" });
    const release = syncLocation({
      host: watched,
      location,
      keepsViews: true,
      issues: [],
    }).observe();
    read.mockClear();
    provider.navigateWindow({ page: 2 });
    expect(location.read().get("page")).toBe("2");
    expect(read).toHaveBeenCalledTimes(1);
    release();
  });

  it("adopts an external location change", () => {
    const { provider, host, location, sync } = setUp({ href: "/machines" });
    const release = sync.observe();
    const inputs = createFilterInputs({ host });
    const stopInputs = inputs.observe();
    inputs.handles.cpu.gte.edit("4");
    location.write(new URLSearchParams("status=ready&page=2"));
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["ready"] },
    ]);
    expect(provider.state.get().window).toEqual(windowAt({ page: 2 }));
    // The authoritative query wins: the stale input session is discarded.
    expect(inputs.handles.cpu.gte.state.get().input).toBe("");
    stopInputs();
    release();
  });

  it("adopts a return to a spelling it once wrote, and never writes it back", () => {
    // Forward after Back lands on the very text the loop wrote earlier. The
    // echo guard forgets every write once the location moves elsewhere, so
    // the return is a move like any other.
    const { location, writes, move } = recording("/machines");
    const { provider, sync } = setUp({ location });
    const release = sync.observe();
    provider.navigateWindow({ page: 2 });
    provider.navigateWindow({ page: 3 });
    writes.length = 0;
    // Back, then Forward, as the browser replays them through the port.
    move("page=2&size=50");
    expect(provider.state.get().window.page).toBe(2);
    move("page=3&size=50");
    expect(provider.state.get().window.page).toBe(3);
    // Both adopted, neither written back.
    expect(writes).toEqual([]);
    release();
  });

  it("replaces by default and pushes when asked", () => {
    // The default is the provider's: a search replaces, so typing never
    // floods history; a policy naming the search transition makes it push.
    const location = createMemoryLocation();
    const write = vi.spyOn(location, "write");
    const provider = createDataViewsProvider({
      collection: machines,
      source: sourceOf().source,
      location,
    });
    const release = provider.observe();
    provider.setSearch("ya");
    expect(write).toHaveBeenLastCalledWith(expect.anything(), {
      history: "replace",
    });
    release();

    const pushing = createDataViewsProvider({
      collection: machines,
      source: sourceOf().source,
      location,
      history: { search: "push" },
    });
    const releasePushing = pushing.observe();
    pushing.setSearch("yak");
    expect(write).toHaveBeenLastCalledWith(expect.anything(), {
      history: "push",
    });
    releasePushing();
  });

  it("enters history by the transition: search replaces, the rest push", () => {
    const { location, writes } = recording("/machines");
    const { provider, host, sync } = setUp({ location });
    const release = sync.observe();
    writes.length = 0;
    host.setPredicate({
      field: "status",
      operator: "isAny",
      operands: ["ready"],
    });
    provider.setSearch("yak");
    provider.setSort([{ field: "cpu", direction: "asc" }]);
    provider.navigateWindow({ page: 2 });
    host.removePredicate("status", "isAny");
    expect(writes.map(([, mode]) => mode)).toEqual([
      "push",
      "replace",
      "push",
      "push",
      "push",
    ]);
    release();
  });

  it("drives history through the port alone: a search replaces, a sort pushes, Back adopts and writes nothing back", () => {
    // Proven against the port's own record, never a browser: every write
    // the loop makes reaches `write` with its mode, every move it learns of
    // arrives through `subscribe`, and the loop touches nothing else.
    const { location, writes, notifications, move } = createRecordingLocation({
      href: "/machines",
    });
    const { provider, sync } = setUp({ location });
    const release = sync.observe();
    writes.length = 0;
    notifications.length = 0;
    provider.setSearch("ya");
    provider.setSearch("yak");
    provider.setSort([{ field: "cpu", direction: "asc" }]);
    expect(writes).toEqual([
      ["q=ya&page=1&size=50", "replace"],
      ["q=yak&page=1&size=50", "replace"],
      ["q=yak&sort=cpu__asc&page=1&size=50", "push"],
    ]);
    // Each write echoed once through the port, and each echo stopped.
    expect(notifications).toEqual(writes.map(([params]) => params));
    // Back, then Forward, arrive through the port's subscribe.
    writes.length = 0;
    move("q=yak&page=1&size=50");
    expect(provider.state.get().slice.sort).toEqual([]);
    move("q=yak&sort=cpu__asc&page=1&size=50");
    expect(provider.state.get().slice.sort).toEqual([
      { field: "cpu", direction: "asc" },
    ]);
    // Adopted, and nothing written back.
    expect(writes).toEqual([]);
    release();
  });

  it("follows a policy naming one mode for every transition", () => {
    const { location, writes } = recording("/machines");
    const { provider, host, sync } = setUp({ location, history: "replace" });
    const release = sync.observe();
    writes.length = 0;
    host.setPredicate({
      field: "status",
      operator: "isAny",
      operands: ["ready"],
    });
    provider.setSort([{ field: "cpu", direction: "asc" }]);
    provider.navigateWindow({ page: 2 });
    expect(writes.map(([, mode]) => mode)).toEqual([
      "replace",
      "replace",
      "replace",
    ]);
    release();
  });

  it("pushes a saved view's query and writes nothing for the location's own", () => {
    const { location, writes } = recording("/machines");
    const { host, sync } = setUp({ location });
    const release = sync.observe();
    writes.length = 0;
    // Opened the way a saved view is: the view's authority, a step Back
    // returns from.
    host.adopt(
      {
        slice: {
          filter: [{ field: "status", operator: "isAny", operands: ["ready"] }],
          search: null,
          sort: [],
          group: [],
        },
        window: DEFAULT_WINDOW,
      },
      "view",
      null,
    );
    expect(writes).toEqual([["status=ready&page=1&size=50", "push"]]);
    // Adopted the way the location's own query is: never written back.
    host.adopt(
      {
        slice: { filter: [], search: null, sort: [], group: [] },
        window: DEFAULT_WINDOW,
      },
      "adopt",
      null,
    );
    expect(writes).toHaveLength(1);
    release();
  });

  it("moves the open view with the query in one write: opened pushes, reverted and left replace", () => {
    const { location, writes } = recording("/machines?status=ready");
    const { host, sync } = setUp({ location });
    const release = sync.observe();
    writes.length = 0;
    const opened = host.state.get();
    // A view opened over the query already in force: its name alone moves.
    host.adopt({ slice: opened.slice, window: opened.window }, "view", "v1");
    // A command keeps the view's id beside the query it moves.
    host.setPredicate({
      field: "status",
      operator: "isAny",
      operands: ["failed"],
    });
    host.adopt({ slice: opened.slice, window: opened.window }, "revert", "v1");
    const reverted = host.state.get();
    host.adopt(
      { slice: reverted.slice, window: reverted.window },
      "revert",
      null,
    );
    expect(writes).toEqual([
      ["view=v1&status=ready&page=1&size=50", "push"],
      ["view=v1&status=failed&page=1&size=50", "push"],
      ["view=v1&status=ready&page=1&size=50", "replace"],
      ["status=ready&page=1&size=50", "replace"],
    ]);
    release();
  });

  it("adopts the view id a location carries and its absence, writing neither back", () => {
    const { location, writes, move } = recording("/machines?view=v1");
    const { host, sync } = setUp({ location });
    const release = sync.observe();
    // A name alone is a query carried: read, and respelt canonically.
    expect(host.view.get()).toBe("v1");
    expect(location.read().toString()).toBe("view=v1&page=1&size=50");
    move("status=ready&page=1&size=50");
    expect(host.view.get()).toBeNull();
    move("status=ready&view=v2&page=1&size=50");
    expect(host.view.get()).toBe("v2");
    expect(location.read().toString()).toBe(
      "view=v2&status=ready&page=1&size=50",
    );
    // Respellings in place only: nothing of the reader's is ever pushed.
    expect(writes.every(([, history]) => history === "replace")).toBe(true);
    release();
  });

  it("publishes the owned parameters it refused, and narrows nothing", () => {
    const { provider, location, sync } = setUp({
      href: "/machines?status=melted&cpu__near=4&tab=overview",
    });
    const release = sync.observe();
    expect(sync.issues.get()).toEqual([
      MELTED,
      {
        parameter: "cpu__near",
        code: "malformed",
        reason: 'unknown operator "near"',
      },
    ]);
    expect(provider.state.get().slice.filter).toEqual([]);
    // The host's parameter survives, and so does the refused clause.
    expect(location.read().get("tab")).toBe("overview");
    release();
  });

  it("leaves a refused parameter standing until the query moves", () => {
    const { host, location, sync } = setUp({ href: "/machines?status=melted" });
    const release = sync.observe();
    // Not rewritten: a reload must show the same error, not a broader query.
    expect(location.read().toString()).toBe("status=melted");

    // A row completion is not a query change, so it does not rewrite either.
    const requestId = host.refresh();
    expect(host.complete(requestId, delivered([{ id: "a" }]))).toBe(true);
    expect(location.read().toString()).toBe("status=melted");

    // Moving the query does: the user has replaced what was refused.
    host.setPredicate({
      field: "status",
      operator: "isAny",
      operands: ["ready"],
    });
    expect(location.read().toString()).toBe("status=ready&page=1&size=50");
    expect(sync.issues.get()).toEqual([]);
    release();
  });

  it("leaves a refused parameter standing when the location also moves", () => {
    const { provider, location, sync } = setUp({
      href: "/machines?status=melted&page=2",
    });
    const release = sync.observe();
    // The adoption is never written back, so the refusal is not rewritten
    // away and its report stands.
    expect(location.read().toString()).toBe("status=melted&page=2");
    expect(sync.issues.get()).toEqual([MELTED]);
    expect(provider.state.get().window).toEqual(windowAt({ page: 2 }));
    release();
  });

  it("adopts an external change through every live observation", () => {
    const { provider, location, sync } = setUp({ href: "/machines" });
    const first = sync.observe();
    const second = sync.observe();
    // Two observations share no listener registration: releasing one leaves
    // the other reading the location.
    first();
    location.write(new URLSearchParams("status=ready&page=1&size=50"));
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["ready"] },
    ]);
    second();
  });

  it("re-encodes nothing for a publication that does not move the query", () => {
    const { provider, host, location, sync } = setUp({ href: "/machines" });
    const release = sync.observe();
    const read = vi.spyOn(location, "read");
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const requestId = host.refresh();
      host.complete(requestId, delivered([{ id: "a" }]));
    }
    expect(read).not.toHaveBeenCalled();
    // A query that does move is still written.
    provider.navigateWindow({ page: 2 });
    expect(location.read().get("page")).toBe("2");
    release();
  });

  it("notifies on a changed issue list and not on a restated one", () => {
    const { location, sync } = setUp({ href: "/machines?status=melted" });
    const release = sync.observe();
    const seen = vi.fn();
    const stop = sync.issues.subscribe(seen);

    location.write(new URLSearchParams("status=melted&page=1&size=50"));
    expect(seen).not.toHaveBeenCalled();

    location.write(new URLSearchParams("status=liquid&page=1&size=50"));
    expect(seen).toHaveBeenCalledTimes(1);

    location.write(new URLSearchParams("cpu__near=4&page=1&size=50"));
    expect(seen).toHaveBeenCalledTimes(2);

    location.write(new URLSearchParams("page=1&size=50"));
    expect(sync.issues.get()).toEqual([]);
    expect(seen).toHaveBeenCalledTimes(3);
    stop();
    release();
  });

  it("keeps the host's repeated parameters and their order through the loop", () => {
    const { provider, location, sync } = setUp({
      href: "/machines?tab=a&status=failed&status=cancelled&tab=b",
    });
    const release = sync.observe();
    provider.navigateWindow({ page: 2 });
    expect(location.read().toString()).toBe(
      "tab=a&tab=b&status=cancelled&status=failed&page=2&size=50",
    );
    release();
  });

  it("owes a moved location a write when observed again", () => {
    const { provider, location, sync } = setUp({ href: "/machines" });
    sync.observe()();
    const release = sync.observe();
    provider.navigateWindow({ page: 2 });
    release();
    location.write(new URLSearchParams("tab=x"));
    const again = sync.observe();
    expect(location.read().toString()).toBe("tab=x&page=2&size=50");
    again();
  });

  it("lets a reset nothing observed win over the location, once", () => {
    const { location, writes } = recording("/machines");
    const { provider, sync } = setUp({ location });
    const release = sync.observe();
    provider.setSort([{ field: "cpu", direction: "desc" }]);
    release();
    // Reset while nothing observed: no port ran, so the location still carries
    // the ordering. The next observation reads that the last move was a reset
    // and writes where the provider started over it rather than adopting it.
    provider.reset();
    writes.length = 0;
    const again = sync.observe();
    expect(provider.state.get().slice.sort).toEqual([]);
    expect(writes).toEqual([["page=1&size=50", "replace"]]);
    again();
    // Reset again, unheard, with the location standing where the provider
    // started already: the next observation has nothing to write.
    provider.reset();
    writes.length = 0;
    sync.observe()();
    expect(writes).toEqual([]);
  });

  it("hears the reset it writes on observing, so a later move is the reader's", () => {
    const { location, writes } = recording("/machines");
    const { provider, sync } = setUp({ location });
    // Reset while nothing observed: unheard, written on the next observe.
    provider.reset();
    const first = sync.observe();
    expect(writes).toEqual([["page=1&size=50", "replace"]]);
    first();
    // Heard then, so the reader's move while nothing observes stands.
    location.write(new URLSearchParams("status=failed"));
    writes.length = 0;
    const second = sync.observe();
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["failed"] },
    ]);
    expect(writes).toEqual([["status=failed&page=1&size=50", "replace"]]);
    second();
  });

  it("lets only a reset win over a location carrying a query on observe", () => {
    // A view opened while nothing observed moved the host; the location
    // still carries a query, and it is the location that wins on observe.
    const { host, location, sync } = setUp({ href: "/machines?status=failed" });
    host.adopt(
      {
        slice: { filter: [], search: null, sort: [], group: [] },
        window: { ...DEFAULT_WINDOW, page: 3 },
      },
      "view",
      null,
    );
    const release = sync.observe();
    expect(host.state.get().slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["failed"] },
    ]);
    expect(host.state.get().window.page).toBe(1);
    expect(location.read().toString()).toBe("status=failed&page=1&size=50");
    release();
  });

  it("leaves a location moved after a reset it heard to the reader", () => {
    const { location, writes } = recording("/machines");
    const { provider, sync } = setUp({ location });
    const release = sync.observe();
    provider.setSort([{ field: "cpu", direction: "desc" }]);
    // Reset while observed: heard, and written at once, replacing.
    provider.reset();
    expect(writes.at(-1)).toEqual(["page=1&size=50", "replace"]);
    release();
    // Unobserved, the reader goes somewhere else — Back, a bookmark. The
    // reset was written already, so the next observation adopts the
    // location rather than writing where the provider started over it.
    location.write(new URLSearchParams("status=failed"));
    writes.length = 0;
    const again = sync.observe();
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["failed"] },
    ]);
    expect(writes).toEqual([["status=failed&page=1&size=50", "replace"]]);
    again();
  });

  it("reports afresh when observed again", () => {
    const { location, sync } = setUp({
      href: "/machines?status=failed&status=melted",
    });
    sync.observe()();
    location.write(new URLSearchParams("tab=x"));
    const release = sync.observe();
    expect(sync.issues.get()).toEqual([]);
    // Carrying no query, the location takes what the host holds.
    expect(location.read().toString()).toBe(
      "tab=x&status=failed&page=1&size=50",
    );
    release();
  });

  it("writes a return to the position it stood at before a refused link", () => {
    const { provider, host, location, sync } = setUp({ href: "/machines" });
    const release = sync.observe();
    location.write(new URLSearchParams("status=failed&status=melted"));
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["failed"] },
    ]);
    // Back where the loop last wrote — but the location has moved since,
    // so it is owed the write.
    host.removePredicate("status", "isAny");
    expect(location.read().toString()).toBe("page=1&size=50");
    expect(sync.issues.get()).toEqual([]);
    release();
  });

  it("pushes only the host's transitions, never where it started or a respelling", () => {
    const location = createMemoryLocation({ href: "/machines" });
    const write = vi.spyOn(location, "write");
    const { provider, sync } = setUp({ location, history: "push" });
    const release = sync.observe();
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

  it("respells a location before adopting it, so a move the adoption provokes lands last", () => {
    const { location, writes, move } = recording("/machines");
    const { provider, sync } = setUp({ location });
    const release = sync.observe();
    // Reacting to the adoption, something pages on.
    const stop = provider.state.subscribe(() => {
      if (provider.state.get().window.page === 7) {
        provider.navigateWindow({ page: 8 });
      }
    });
    writes.length = 0;
    move("page=007&size=50");
    // The respelling first, replacing; then the step, pushing — and the
    // location ends where the step went.
    expect(writes).toEqual([
      ["page=7&size=50", "replace"],
      ["page=8&size=50", "push"],
    ]);
    expect(location.read().toString()).toBe("page=8&size=50");
    stop();
    release();
  });

  it("clears its report on writing, whether or not the location echoes", () => {
    const memory = createMemoryLocation({ href: "/machines?status=melted" });
    // A location that never notifies: the loop hears no echo.
    const location: QueryLocation = { ...memory, subscribe: () => () => {} };
    const { host, sync } = setUp({ location });
    const release = sync.observe();
    expect(sync.issues.get()).toEqual([MELTED]);
    host.setPredicate({
      field: "status",
      operator: "isAny",
      operands: ["ready"],
    });
    expect(location.read().toString()).toBe("status=ready&page=1&size=50");
    expect(sync.issues.get()).toEqual([]);
    release();
  });

  it("refuses a clause the host's source cannot execute rather than adopting it", () => {
    const { provider, location, sync } = setUp({
      href: "/machines?status=ready&cpu__gte=4&sort=cpu__asc",
      capabilities: declare({ filter: { status: ["isAny"], cpu: ["lte"] } }),
    });
    const release = sync.observe();
    expect(provider.state.get().slice).toEqual({
      filter: [{ field: "status", operator: "isAny", operands: ["ready"] }],
      search: null,
      sort: [],
      group: [],
    });
    // Each refusal keeps the code the source gave it.
    expect(sync.issues.get()).toEqual([
      {
        parameter: "cpu__gte",
        code: "undeclared-operator",
        reason: 'field "cpu" cannot be filtered with gte',
      },
      {
        parameter: "sort",
        code: "too-many-terms",
        reason: "this source cannot sort",
      },
    ]);
    // Standing, like any refusal, until the query moves.
    expect(location.read().toString()).toBe(
      "status=ready&cpu__gte=4&sort=cpu__asc",
    );
    release();
  });

  it("refuses a sort its source cannot execute arriving in the location, and answers the rest", () => {
    const source = createArraySource({
      rows: fleet,
      collection: machinesWithoutCpu,
    });
    const provider = createDataViewsProvider({ collection: machines, source });
    const host = readProviderHost(provider);
    const stopSource = runSource({ host, source, facets: [] }).observe();
    const location = createMemoryLocation({
      href: "/machines?status=failed&sort=cpu__asc",
    });
    const sync = syncLocation({ host, location, keepsViews: true, issues: [] });
    const release = sync.observe();
    expect(sync.issues.get()).toEqual([
      {
        parameter: "sort",
        code: "undeclared-field",
        reason: 'field "cpu" cannot be sorted',
      },
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
    // The declaration permits an ordering by cpu, so the location's sort is
    // adopted; it is the source's own check that refuses it, which the
    // decode cannot see.
    const source: Source = {
      ...createArraySource({ rows: fleet, collection: machines }),
      refusals: (query) =>
        query.slice.sort.some((term) => term.field === "cpu")
          ? [CPU_UNSORTABLE]
          : [],
    };
    const provider = createDataViewsProvider({ collection: machines, source });
    const host = readProviderHost(provider);
    const stopSource = runSource({ host, source, facets: [] }).observe();
    const location = createMemoryLocation({ href: "/machines?status=failed" });
    const release = syncLocation({
      host,
      location,
      keepsViews: true,
      issues: [],
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
      refusals: [CPU_UNSORTABLE],
    });

    location.write(new URLSearchParams("status=ready"));
    const recovered = provider.state.get();
    expect(recovered.result.status).toBe("ready");
    expect(recovered.resultMatchesQuery).toBe(true);
    expect(recovered.result.rows).toHaveLength(3);
    release();
    stopSource();
  });

  it("pushes a history entry for a sort command, by its own default", () => {
    const { location, writes } = recording("/machines");
    const { provider, sync } = setUp({ location });
    const release = sync.observe();
    provider.setSort([{ field: "cpu", direction: "asc" }]);
    provider.setSort([{ field: "cpu", direction: "desc" }]);
    provider.setSort([
      { field: "cpu", direction: "desc" },
      { field: "status", direction: "asc" },
    ]);
    provider.setSort([{ field: "status", direction: "asc" }]);
    expect(writes).toEqual([
      ["page=1&size=50", "replace"],
      ["sort=cpu__asc&page=1&size=50", "push"],
      ["sort=cpu__desc&page=1&size=50", "push"],
      ["sort=cpu__desc&sort=status__asc&page=1&size=50", "push"],
      ["sort=status__asc&page=1&size=50", "push"],
    ]);
    release();
  });

  it("writes nothing when a sort command only respells the ordering in force", () => {
    const { location, writes } = recording("/machines?sort=cpu__asc");
    const { provider, sync } = setUp({ location });
    const release = sync.observe();
    const before = writes.length;
    provider.setSort([
      { field: "cpu", direction: "asc" },
      { field: "cpu", direction: "desc" },
    ]);
    expect(writes.slice(before)).toEqual([]);
    release();
  });

  it("replaces rather than pushes when a command leaves the ordering alone", () => {
    // A search beside a standing ordering is still a search: it replaces.
    const { location, writes } = recording("/machines?sort=cpu__asc");
    const { provider, sync } = setUp({ location });
    const release = sync.observe();
    provider.setSearch("yak");
    expect(writes).toEqual([
      ["sort=cpu__asc&page=1&size=50", "replace"],
      ["q=yak&sort=cpu__asc&page=1&size=50", "replace"],
    ]);
    release();
  });

  it("replaces when a location respells an ordering it already carries", () => {
    // The first occurrence is the ordering, so the duplicate is a
    // respelling rather than a step the reader took.
    const { location, writes } = recording(
      "/machines?sort=cpu__asc&sort=cpu__desc",
    );
    const { provider, sync } = setUp({ location });
    const release = sync.observe();
    expect(provider.state.get().slice.sort).toEqual([
      { field: "cpu", direction: "asc" },
    ]);
    expect(writes).toEqual([["sort=cpu__asc&page=1&size=50", "replace"]]);
    release();
  });

  it("retries a write the location threw on at the next transition", () => {
    const { provider, location, sync } = setUp({ href: "/machines" });
    const release = sync.observe();
    const write = vi.spyOn(location, "write").mockImplementationOnce(() => {
      throw new Error("history refused");
    });
    expect(() => provider.navigateWindow({ page: 2 })).toThrow(
      "history refused",
    );
    expect(location.read().get("page")).toBe("1");
    // A publication that moves nothing owes nothing; the next move writes.
    provider.refresh();
    expect(write).toHaveBeenCalledTimes(1);
    provider.navigateWindow({ page: 3 });
    expect(write).toHaveBeenCalledTimes(2);
    expect(location.read().get("page")).toBe("3");
    release();
  });

  it("adopts a spelling it failed to write when it later arrives from outside", () => {
    const { provider, location, sync } = setUp({ href: "/machines" });
    const release = sync.observe();
    vi.spyOn(location, "write").mockImplementationOnce(() => {
      throw new Error("history refused");
    });
    expect(() => provider.navigateWindow({ page: 2 })).toThrow(
      "history refused",
    );
    // Back to page one under the host: the failed spelling is no echo to
    // await, so the same text arriving from outside is a move.
    location.write(new URLSearchParams("page=1&size=50"));
    expect(provider.state.get().window.page).toBe(1);
    location.write(new URLSearchParams("page=2&size=50"));
    expect(provider.state.get().window.page).toBe(2);
    release();
  });

  it("writes and adopts a change of page size alone", () => {
    const { provider, location, sync } = setUp({ href: "/machines" });
    const release = sync.observe();
    provider.navigateWindow({ page: 1, size: 25 });
    expect(location.read().toString()).toBe("page=1&size=25");
    location.write(new URLSearchParams("page=1&size=10"));
    expect(provider.state.get().window).toEqual(windowAt({ size: 10 }));
    release();
  });

  it("notifies when only the refused parameter changes", () => {
    const { location, sync } = setUp({ href: "/machines?page=0" });
    const release = sync.observe();
    const seen = vi.fn();
    const stop = sync.issues.subscribe(seen);
    location.write(new URLSearchParams("size=0"));
    expect(seen).toHaveBeenCalledTimes(1);
    expect(sync.issues.get()).toEqual([
      {
        parameter: "size",
        code: "malformed",
        reason: '"0" is not a positive integer',
      },
    ]);
    stop();
    release();
  });

  it("refuses a command the source cannot execute at the boundary, and writes nothing", () => {
    // Refused before it moves anything: the provider announces no
    // transition, so the loop hears nothing and the URL is left as it was.
    const { location, writes } = recording("/machines");
    const { provider, sync } = setUp({
      location,
      capabilities: declare({
        filter: { status: ["isAny"] },
        sort: declareSort(["status"]),
      }),
    });
    const release = sync.observe();
    expect(writes).toEqual([["page=1&size=50", "replace"]]);

    expect(provider.setSort([{ field: "cpu", direction: "asc" }])).toEqual([
      CPU_UNSORTABLE,
    ]);
    expect(provider.setSearch("yak")).toEqual([
      expect.objectContaining({ part: "search" }),
    ]);
    expect(writes).toHaveLength(1);
    expect(location.read().toString()).toBe("page=1&size=50");
    expect(sync.issues.get()).toEqual([]);
    expect(provider.state.get().slice).toEqual({
      filter: [],
      search: null,
      sort: [],
      group: [],
    });

    // A command the source does execute still writes.
    expect(provider.setSort([{ field: "status", direction: "asc" }])).toEqual(
      [],
    );
    expect(location.read().toString()).toBe("sort=status__asc&page=1&size=50");
    release();
  });

  it("writes nothing for a collapse, which has no spelling", () => {
    const { location, writes } = recording("/machines");
    const { provider, host, sync } = setUp({
      location,
      capabilities: declare({
        group: {
          fields: ["status"],
          levels: 1,
          collapse: true,
          summaries: "none",
        },
      }),
    });
    const release = sync.observe();
    writes.length = 0;
    // The source honours collapse, so the command passes the boundary: the
    // window moved, the transition enters no history, and the location
    // hears nothing.
    expect(provider.setCollapsed([["failed"]])).toEqual([]);
    expect(host.state.get().window.collapsed).toEqual([["failed"]]);
    expect(host.transitions.get()).toMatchObject({
      cause: "collapse",
      history: null,
    });
    expect(writes).toEqual([]);
    release();
  });

  it("keeps a refusal its own write provoked, under a location that echoes at once", () => {
    // A host transition the source cannot execute — adopted, as a saved
    // view is, past the boundary: written, echoed at once, and read back
    // from the spelling itself, so the clause is refused and the host
    // narrowed exactly as a reload of that URL would leave them.
    const { provider, host, location, sync } = setUp({
      href: "/machines",
      capabilities: NOTHING_DECLARED,
    });
    const release = sync.observe();
    adoptSearch(host, "abc");
    expect(sync.issues.get()).toEqual([SEARCH_REFUSED]);
    expect(provider.state.get().slice.search).toBeNull();
    // Standing: a publication at the adopted position rewrites nothing, and
    // the refused link stays for a reload to refuse again.
    provider.refresh();
    expect(location.read().toString()).toBe("q=abc&page=1&size=50");
    release();
  });

  it("refuses an unexecutable clause again when the host re-applies it", () => {
    const { provider, host, location, sync } = setUp({
      href: "/machines?q=abc&page=1&size=50",
      capabilities: NOTHING_DECLARED,
    });
    const release = sync.observe();
    expect(provider.state.get().slice.search).toBeNull();
    // The encode matches what the location already says, so nothing is
    // written and nothing echoes — the refusal must still hold.
    adoptSearch(host, "abc");
    expect(sync.issues.get()).toEqual([SEARCH_REFUSED]);
    expect(provider.state.get().slice.search).toBeNull();
    expect(location.read().toString()).toBe("q=abc&page=1&size=50");
    release();
  });

  it("keeps a refusal when a listener throws after the write landed", () => {
    const { provider, host, location, sync } = setUp({
      href: "/machines",
      capabilities: NOTHING_DECLARED,
    });
    const release = sync.observe();
    let thrown = false;
    const stop = location.subscribe(() => {
      if (!thrown) {
        thrown = true;
        throw new Error("listener failed");
      }
    });
    expect(() => adoptSearch(host, "abc")).toThrow("listener failed");
    expect(sync.issues.get()).toEqual([SEARCH_REFUSED]);
    expect(provider.state.get().slice.search).toBeNull();
    // Written, so not retried: the refused link stands.
    provider.refresh();
    expect(location.read().toString()).toBe("q=abc&page=1&size=50");
    stop();
    release();
  });

  it("keeps a refusal when a listener that threw first never let it echo", () => {
    const location = createMemoryLocation({ href: "/machines" });
    // Subscribed before the loop, so its throw stops the location before
    // the loop's own listener hears the write.
    let armed = false;
    const stop = location.subscribe(() => {
      if (armed) {
        armed = false;
        throw new Error("listener failed");
      }
    });
    const { provider, host, sync } = setUp({
      location,
      capabilities: NOTHING_DECLARED,
    });
    const release = sync.observe();
    armed = true;
    expect(() => adoptSearch(host, "abc")).toThrow("listener failed");
    expect(sync.issues.get()).toEqual([SEARCH_REFUSED]);
    expect(provider.state.get().slice.search).toBeNull();
    stop();
    release();
  });

  it("keeps writing when a listener throws after the write landed", () => {
    const { provider, location, sync } = setUp({ href: "/machines" });
    const release = sync.observe();
    let thrown = false;
    const stop = location.subscribe(() => {
      if (!thrown) {
        thrown = true;
        throw new Error("listener failed");
      }
    });
    expect(() => provider.navigateWindow({ page: 2 })).toThrow(
      "listener failed",
    );
    // Written, so not retried: the loop's own listener heard the echo.
    expect(location.read().toString()).toBe("page=2&size=50");
    provider.navigateWindow({ page: 3 });
    expect(location.read().toString()).toBe("page=3&size=50");
    stop();
    release();
  });

  it("keeps writing when a listener that threw first never let it echo", () => {
    const location = createMemoryLocation({ href: "/machines" });
    // Subscribed before the loop, so its throw stops the location before
    // the loop's own listener hears the write.
    let armed = false;
    const stop = location.subscribe(() => {
      if (armed) {
        armed = false;
        throw new Error("listener failed");
      }
    });
    const { provider, sync } = setUp({ location });
    const release = sync.observe();
    armed = true;
    expect(() => provider.navigateWindow({ page: 2 })).toThrow(
      "listener failed",
    );
    expect(location.read().toString()).toBe("page=2&size=50");
    // The unheard echo is still the loop's own write: an external move to
    // another spelling is adopted, the same spelling is not re-adopted.
    provider.navigateWindow({ page: 3 });
    expect(location.read().toString()).toBe("page=3&size=50");
    location.write(new URLSearchParams("page=4&size=50"));
    expect(provider.state.get().window.page).toBe(4);
    stop();
    release();
  });

  it("writes a host move made while the location was being read back", () => {
    const { provider, host, location, sync } = setUp({
      href: "/machines?q=abc&page=1&size=50",
      capabilities: NOTHING_DECLARED,
    });
    const release = sync.observe();
    adoptSearch(host, "abc");
    // Refused again by the read-back — and, reacting to that, something
    // else pages on. That move is the user's, not the read-back's.
    const stop = provider.state.subscribe(() => {
      const { slice, window } = provider.state.get();
      if (slice.search === null && window.page === 1) {
        provider.navigateWindow({ page: 2 });
      }
    });
    adoptSearch(host, "abc");
    expect(provider.state.get().window.page).toBe(2);
    expect(location.read().toString()).toBe("page=2&size=50");
    stop();
    release();
  });

  it("canonicalizes a location respelled while it was being read back", () => {
    const { provider, host, location, sync } = setUp({
      href: "/machines?q=abc&page=1&size=50",
      capabilities: NOTHING_DECLARED,
    });
    const release = sync.observe();
    adoptSearch(host, "abc");
    let respelled = false;
    const stop = provider.state.subscribe(() => {
      if (!respelled && provider.state.get().slice.search === null) {
        respelled = true;
        location.write(new URLSearchParams("page=007&size=50"));
      }
    });
    adoptSearch(host, "abc");
    expect(provider.state.get().window.page).toBe(7);
    expect(location.read().toString()).toBe("page=7&size=50");
    stop();
    release();
  });

  it("owes a read-back respelling a replace, even in push mode", () => {
    const { location, writes, move } = recording(
      "/machines?q=abc&page=1&size=50",
    );
    const { provider, host, sync } = setUp({
      location,
      capabilities: NOTHING_DECLARED,
      history: "push",
    });
    const release = sync.observe();
    adoptSearch(host, "abc");
    let step = 0;
    const stop = provider.state.subscribe(() => {
      const { slice } = provider.state.get();
      if (step === 0 && slice.search === null) {
        step = 1;
        move("page=007&size=50");
      }
    });
    writes.length = 0;
    adoptSearch(host, "abc");
    expect(writes.at(-1)).toEqual(["page=7&size=50", "replace"]);
    stop();
    release();
  });

  it("owes a host move made during a read-back the transition's push", () => {
    const { location, writes } = recording("/machines?q=abc&page=1&size=50");
    const { provider, host, sync } = setUp({
      location,
      capabilities: NOTHING_DECLARED,
      history: "push",
    });
    const release = sync.observe();
    adoptSearch(host, "abc");
    const pager = provider.state.subscribe(() => {
      const { slice, window } = provider.state.get();
      if (slice.search === null && window.page === 1) {
        provider.navigateWindow({ page: 2 });
      }
    });
    writes.length = 0;
    adoptSearch(host, "abc");
    expect(writes).toEqual([["page=2&size=50", "push"]]);
    pager();
    release();
  });

  it("lets a genuine move after a respelling in one read-back push", () => {
    const { location, writes, move } = recording(
      "/machines?q=abc&page=1&size=50",
    );
    const { provider, host, sync } = setUp({
      location,
      capabilities: NOTHING_DECLARED,
      history: "push",
    });
    const release = sync.observe();
    adoptSearch(host, "abc");
    let respelled = false;
    const respell = provider.state.subscribe(() => {
      if (!respelled && provider.state.get().slice.search === null) {
        respelled = true;
        move("page=007&size=50");
      }
    });
    // Subscribed after the loop: it moves once the respelling is adopted.
    const mover = location.subscribe(() => {
      if (provider.state.get().window.page === 7) {
        provider.navigateWindow({ page: 8 });
      }
    });
    writes.length = 0;
    adoptSearch(host, "abc");
    // Each move enters history on its own terms: the respelling replaces,
    // the step the user took pushes.
    expect(writes).toEqual([
      ["page=7&size=50", "replace"],
      ["page=8&size=50", "push"],
    ]);
    mover();
    respell();
    release();
  });

  it("keeps a read-back respelling a replace when the host republishes in place", () => {
    const { location, writes, move } = recording(
      "/machines?q=abc&page=1&size=50",
    );
    const { provider, host, sync } = setUp({
      location,
      capabilities: NOTHING_DECLARED,
      history: "push",
    });
    const release = sync.observe();
    adoptSearch(host, "abc");
    let respelled = false;
    const respell = provider.state.subscribe(() => {
      if (!respelled && provider.state.get().slice.search === null) {
        respelled = true;
        move("page=007&size=50");
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
    adoptSearch(host, "abc");
    expect(writes).toEqual([["page=7&size=50", "replace"]]);
    republish();
    respell();
    release();
  });

  it("keeps writing after a listener throws during a read-back", () => {
    const { provider, host, location, sync } = setUp({
      href: "/machines?q=abc&page=1&size=50",
      capabilities: NOTHING_DECLARED,
    });
    const release = sync.observe();
    adoptSearch(host, "abc");
    let armed = true;
    const stop = provider.state.subscribe(() => {
      if (armed && provider.state.get().slice.search === null) {
        armed = false;
        throw new Error("listener failed");
      }
    });
    expect(() => adoptSearch(host, "abc")).toThrow("listener failed");
    stop();
    provider.navigateWindow({ page: 3 });
    expect(location.read().get("page")).toBe("3");
    release();
  });

  it("reads back once for a host that publishes on adopt without moving", () => {
    const provider = createMachinesProvider(NOTHING_DECLARED);
    const host = readProviderHost(provider);
    // Breaks the adopt contract: it publishes and stays where it was.
    const stubborn: typeof host = {
      ...host,
      adopt: () => {
        host.refresh();
        return null;
      },
    };
    const location = createMemoryLocation({
      href: "/machines?q=abc&page=1&size=50",
    });
    const sync = syncLocation({
      host: stubborn,
      location,
      keepsViews: true,
      issues: [],
    });
    const release = sync.observe();
    const reads = vi.spyOn(location, "read");
    const writes = vi.spyOn(location, "write");
    adoptSearch(host, "abc");
    // Once, and it terminates: a publication is not a transition, so a host
    // that publishes on adopt without moving cannot bring the read-back
    // straight back here, and the refused clause is left standing.
    expect(reads).toHaveBeenCalledTimes(1);
    expect(writes).not.toHaveBeenCalled();
    expect(sync.issues.get()).toEqual([SEARCH_REFUSED]);
    reads.mockRestore();
    writes.mockRestore();
    release();
  });

  it("refuses a snapshot clause its host's source cannot execute, saying so when built", () => {
    const { provider, location, sync } = setUp({
      href: "/machines",
      capabilities: NOTHING_DECLARED,
      query: "status=failed",
    });
    // Refused when the snapshot was read, as a location's clause would be;
    // the location then takes the query the host stands on, which carries
    // nothing refused.
    expect(provider.issues.get()).toEqual([
      {
        parameter: "status",
        code: "undeclared-field",
        reason: 'field "status" cannot be filtered',
      },
    ]);
    const release = sync.observe();
    expect(sync.issues.get()).toEqual([]);
    expect(provider.state.get().slice.filter).toEqual([]);
    expect(location.read().toString()).toBe("page=1&size=50");
    release();
  });

  it("adopts the location before the source runs, so the first request carries its query", () => {
    const manual = sourceOf();
    const location = createMemoryLocation({ href: "/machines?status=failed" });
    const provider = createDataViewsProvider({
      collection: machines,
      source: manual.source,
      location,
    });
    // Construction subscribes to nothing and requests nothing.
    expect(manual.calls).toHaveLength(0);
    const release = provider.observe();
    // One request, and it is the location's query — never the default query
    // followed by a second fetch for the query the location carried all along.
    expect(manual.calls).toHaveLength(1);
    expect(manual.callAt(0).request.slice.filter).toEqual([
      { field: "status", operator: "isAny", operands: ["failed"] },
    ]);
    expect(manual.callAt(0).request.window).toEqual(windowAt());
    expect(location.read().toString()).toBe("status=failed&page=1&size=50");
    expect(provider.issues.get()).toEqual([]);
    release();
  });

  it("releases both directions, and releases once", () => {
    const provider = createMachinesProvider();
    const location = createMemoryLocation({ href: "/machines" });
    const { host, adopt } = spyAdopt(readProviderHost(provider));
    const release = syncLocation({
      host,
      location,
      keepsViews: true,
      issues: [],
    }).observe();
    release();
    release();

    provider.navigateWindow({ page: 4 });
    expect(location.read().get("page")).toBe("1");
    location.write(new URLSearchParams("status=ready"));
    expect(adopt).not.toHaveBeenCalled();
  });

  it("survives a double observe and releases each independently", () => {
    const { provider, location, sync } = setUp({ href: "/machines" });
    const first = sync.observe();
    const second = sync.observe();
    first();

    provider.navigateWindow({ page: 2 });
    expect(location.read().get("page")).toBe("2");
    second();
    provider.navigateWindow({ page: 3 });
    expect(location.read().get("page")).toBe("2");
  });

  describe("echoes after the pass", () => {
    it("reads the spelling of a write that threw, when it arrives later, as a move", () => {
      const location = createMemoryLocation({
        href: "/machines?status=melted",
      });
      const provider = createDataViewsProvider({
        collection: machines,
        source: createManualSource({
          capabilities: declare({ filter: { status: ["isAny"] } }),
        }).source,
        location,
      });
      const release = provider.observe();
      expect(provider.issues.get()).not.toEqual([]);
      vi.spyOn(location, "write").mockImplementationOnce(() => {
        throw new Error("history refused");
      });
      expect(() =>
        readProviderHost(provider).setPredicate({
          field: "status",
          operator: "isAny",
          operands: ["ready"],
        }),
      ).toThrow("history refused");
      location.write(new URLSearchParams("status=ready&page=1&size=50"));
      expect(provider.issues.get()).toEqual([]);
      release();
    });

    it("takes a notification of the spelling the pass wrote as its echo", () => {
      const location = createMemoryLocation({ href: "/machines" });
      const provider = createDataViewsProvider({
        collection: machines,
        source: createManualSource({
          capabilities: declare({ filter: { status: ["isAny"] } }),
        }).source,
        location,
        snapshot: { query: "status=failed&owner__isSet=1", presentation: {} },
      });
      const release = provider.observe();
      expect(provider.issues.get().map(({ parameter }) => parameter)).toEqual([
        "owner__isSet",
      ]);
      // The location notifies of the pass's own write, as a router notifying
      // late does: nothing moved, so the snapshot's refusals stay reported.
      location.write(location.read());
      expect(provider.issues.get().map(({ parameter }) => parameter)).toEqual([
        "owner__isSet",
      ]);
      // A move of the reader's own is read as one.
      location.write(new URLSearchParams("status=ready"));
      expect(provider.issues.get()).toEqual([]);
      release();
    });
  });
});
