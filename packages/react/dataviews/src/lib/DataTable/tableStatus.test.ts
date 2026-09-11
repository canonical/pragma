/**
 * The table's statuses must stay distinct: a collection that failed to load
 * is not an empty one, a query that matched nothing is not a collection with
 * nothing in it, and rows an earlier query produced are not an answer to the
 * current one. Each case is driven through a real provider rather than a
 * hand-built snapshot.
 */
import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { describe, expect, it } from "vitest";
import tableStatus, { sameStatus } from "./tableStatus.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "running"] },
]);

type Provider = ReturnType<
  typeof createDataViewsProvider<typeof schema.fields>
>;

/** Refresh and return the request id, failing loudly rather than casting. */
const refreshRequest = (provider: Provider): string => {
  const requestId = provider.refresh();
  if (requestId === null) {
    throw new Error("expected a refresh request");
  }
  return requestId;
};

/** The request a query edit issued, failing loudly rather than casting. */
const pendingRequest = (provider: Provider): string => {
  const requestId = provider.result.get().pendingRequestId;
  if (requestId === null) {
    throw new Error("expected a pending request");
  }
  return requestId;
};

const loaded = (rows: readonly { readonly id: string }[]) => {
  const provider = createDataViewsProvider({ schema });
  provider.complete(refreshRequest(provider), {
    status: "success",
    rows,
    count: rows.length,
  });
  return provider;
};

describe("tableStatus", () => {
  it("reports nothing displayable yet before any rows arrive", () => {
    const provider = createDataViewsProvider({ schema });
    expect(tableStatus(provider.result.get())).toEqual({ kind: "loading" });
  });

  it("reports the failure of a request that produced no rows", () => {
    const provider = createDataViewsProvider({ schema });
    provider.complete(refreshRequest(provider), {
      status: "failure",
      reason: "the collection is unreachable",
    });
    expect(tableStatus(provider.result.get())).toEqual({
      kind: "error",
      reason: "the collection is unreachable",
    });
  });

  it("reports an unfiltered collection with nothing in it as no data", () => {
    expect(tableStatus(loaded([]).result.get())).toEqual({ kind: "no-data" });
  });

  it("reports a filtered query that matched nothing as no results", () => {
    const provider = loaded([]);
    provider.fields.status.eq.set(["failed"]);
    expect(tableStatus(provider.result.get())).toEqual({ kind: "no-results" });
  });

  it("reports a search that matched nothing as no results", () => {
    const provider = loaded([]);
    provider.setSearch("machine");
    expect(tableStatus(provider.result.get())).toEqual({ kind: "no-results" });
  });

  it("prefers the error over emptiness when an empty result then failed", () => {
    const provider = loaded([]);
    provider.complete(refreshRequest(provider), {
      status: "failure",
      reason: "offline",
    });
    expect(tableStatus(provider.result.get())).toEqual({
      kind: "error",
      reason: "offline",
    });
  });

  it("reports rows an earlier query produced as stale, with the reason", () => {
    const provider = loaded([{ id: "m-1" }]);
    provider.setSearch("machine");
    provider.complete(pendingRequest(provider), {
      status: "failure",
      reason: "search is unavailable",
    });
    expect(tableStatus(provider.result.get())).toEqual({
      kind: "stale",
      reason: "search is unavailable",
    });
  });

  it("reports a failed query with no earlier rows to keep as an error", () => {
    const provider = loaded([]);
    provider.setSearch("machine");
    provider.complete(pendingRequest(provider), {
      status: "failure",
      reason: "search is unavailable",
    });
    expect(provider.result.get().result.status).toBe("stale");
    expect(tableStatus(provider.result.get())).toEqual({
      kind: "error",
      reason: "search is unavailable",
    });
  });

  it("reports nothing for rows kept through a failed refresh of the same query", () => {
    const provider = loaded([{ id: "m-1" }]);
    provider.complete(refreshRequest(provider), {
      status: "failure",
      reason: "offline",
    });
    expect(tableStatus(provider.result.get())).toBeNull();
  });

  it("reports nothing at all while rows are displayed", () => {
    expect(tableStatus(loaded([{ id: "m-1" }]).result.get())).toBeNull();
  });
});

describe("sameStatus", () => {
  it("holds two statuses alike when they say the same thing", () => {
    expect(sameStatus(null, null)).toBe(true);
    expect(
      sameStatus(
        { kind: "stale", reason: "unreachable" },
        { kind: "stale", reason: "unreachable" },
      ),
    ).toBe(true);
  });

  it("tells apart a different kind, a different reason and no status", () => {
    expect(sameStatus({ kind: "loading" }, { kind: "no-data" })).toBe(false);
    expect(
      sameStatus(
        { kind: "error", reason: "unreachable" },
        { kind: "error", reason: "timed out" },
      ),
    ).toBe(false);
    expect(sameStatus({ kind: "loading" }, null)).toBe(false);
  });
});
