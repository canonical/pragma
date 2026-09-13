/**
 * The table's statuses must stay distinct: a collection that failed to load
 * is not an empty one, a query that matched nothing is not a collection with
 * nothing in it, rows an earlier query produced are not an answer to the
 * current one, and rows whose refresh failed are usable rows beside a real
 * failure. Each case is driven through a real provider rather than a
 * hand-built snapshot.
 */
import {
  type Completion,
  createDataViewsProvider,
  createSchema,
  type SourceRefusal,
} from "@canonical/dataviews-core";
import { describe, expect, it } from "vitest";
import { deliverRows } from "../../../../testing/fixtures.js";
import areStatusesEqual from "./areStatusesEqual.js";
import deriveTableStatus from "./deriveTableStatus.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "running"] },
]);

type Row = { readonly id: string };

type Provider = ReturnType<
  typeof createDataViewsProvider<typeof schema.fields, Row>
>;

/** A request the source accepted and could not complete. */
const failure = (reason: string): Completion<Row> => ({
  status: "failed",
  failure: { reason, cause: new Error(reason), transient: null },
});

/** A request the binding refused before executing it. */
const refusal = (...reasons: readonly string[]): Completion<Row> => ({
  status: "refused",
  refusals: reasons.map(
    (reason): SourceRefusal => ({
      part: "sort",
      code: "undeclared-field",
      field: "name",
      operator: null,
      reason,
    }),
  ),
});

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
  const requestId = provider.state.get().pendingRequestId;
  if (requestId === null) {
    throw new Error("expected a pending request");
  }
  return requestId;
};

const loaded = (rows: readonly Row[]): Provider => {
  const provider = createDataViewsProvider<typeof schema.fields, Row>({
    schema,
  });
  provider.complete(refreshRequest(provider), deliverRows(rows));
  return provider;
};

describe("deriveTableStatus", () => {
  it("reports nothing displayable yet before any rows arrive", () => {
    const provider = createDataViewsProvider<typeof schema.fields, Row>({
      schema,
    });
    expect(deriveTableStatus(provider.state.get())).toEqual({
      status: "loading",
    });
  });

  it("reports the failure of a request that produced no rows", () => {
    const provider = createDataViewsProvider<typeof schema.fields, Row>({
      schema,
    });
    provider.complete(
      refreshRequest(provider),
      failure("the collection is unreachable"),
    );
    expect(deriveTableStatus(provider.state.get())).toEqual({
      status: "failed",
      reason: "the collection is unreachable",
    });
  });

  it("reads a refusal's reasons as one sentence", () => {
    const provider = createDataViewsProvider<typeof schema.fields, Row>({
      schema,
    });
    provider.complete(
      refreshRequest(provider),
      refusal("name cannot be ordered", "two orderings at once"),
    );
    expect(deriveTableStatus(provider.state.get())).toEqual({
      status: "failed",
      reason: "name cannot be ordered; two orderings at once",
    });
  });

  it("reports an unfiltered collection with nothing in it as no data", () => {
    expect(deriveTableStatus(loaded([]).state.get())).toEqual({
      status: "no-data",
    });
  });

  it("reports a filtered query that matched nothing as no results", () => {
    const provider = loaded([]);
    provider.fields.status.eq.set(["failed"]);
    expect(deriveTableStatus(provider.state.get())).toEqual({
      status: "no-results",
    });
  });

  it("reports a search that matched nothing as no results", () => {
    const provider = loaded([]);
    provider.setSearch("machine");
    expect(deriveTableStatus(provider.state.get())).toEqual({
      status: "no-results",
    });
  });

  it("prefers the failure over emptiness when an empty result then failed", () => {
    const provider = loaded([]);
    provider.complete(refreshRequest(provider), failure("offline"));
    expect(deriveTableStatus(provider.state.get())).toEqual({
      status: "failed",
      reason: "offline",
    });
  });

  it("reports rows an earlier query produced as stale, with the reason", () => {
    const provider = loaded([{ id: "m-1" }]);
    provider.setSearch("machine");
    provider.complete(
      pendingRequest(provider),
      failure("search is unavailable"),
    );
    expect(provider.state.get().result.status).toBe("stale");
    expect(deriveTableStatus(provider.state.get())).toEqual({
      status: "stale",
      reason: "search is unavailable",
    });
  });

  it("reports a failed query with no earlier rows to keep as a failure", () => {
    const provider = loaded([]);
    provider.setSearch("machine");
    provider.complete(
      pendingRequest(provider),
      failure("search is unavailable"),
    );
    expect(provider.state.get().result.status).toBe("stale");
    expect(deriveTableStatus(provider.state.get())).toEqual({
      status: "failed",
      reason: "search is unavailable",
    });
  });

  it("reports rows kept through a failed refresh, with the reason", () => {
    const provider = loaded([{ id: "m-1" }]);
    provider.complete(refreshRequest(provider), failure("offline"));
    expect(provider.state.get().result.status).toBe("refresh-failed");
    expect(deriveTableStatus(provider.state.get())).toEqual({
      status: "refresh-failed",
      reason: "offline",
    });
  });

  it("reports nothing at all while rows are displayed", () => {
    expect(deriveTableStatus(loaded([{ id: "m-1" }]).state.get())).toBeNull();
  });
});

describe("areStatusesEqual", () => {
  it("holds two statuses alike when they say the same thing", () => {
    expect(areStatusesEqual(null, null)).toBe(true);
    expect(areStatusesEqual({ status: "loading" }, { status: "loading" })).toBe(
      true,
    );
    expect(
      areStatusesEqual(
        { status: "stale", reason: "unreachable" },
        { status: "stale", reason: "unreachable" },
      ),
    ).toBe(true);
  });

  it("tells apart a different status, a different reason and no status", () => {
    expect(areStatusesEqual({ status: "loading" }, { status: "no-data" })).toBe(
      false,
    );
    expect(
      areStatusesEqual(
        { status: "failed", reason: "unreachable" },
        { status: "failed", reason: "timed out" },
      ),
    ).toBe(false);
    expect(
      areStatusesEqual(
        { status: "stale", reason: "offline" },
        { status: "refresh-failed", reason: "offline" },
      ),
    ).toBe(false);
    expect(areStatusesEqual({ status: "loading" }, null)).toBe(false);
    expect(areStatusesEqual(null, { status: "loading" })).toBe(false);
  });
});
