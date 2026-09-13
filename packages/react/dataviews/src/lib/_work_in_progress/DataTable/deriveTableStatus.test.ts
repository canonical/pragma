/**
 * The table's statuses must stay distinct: a collection that failed to load
 * is not an empty one, a query that matched nothing is not a collection with
 * nothing in it, rows an earlier query produced are not an answer to the
 * current one, and rows whose refresh failed are usable rows beside a real
 * failure. Each case is driven through a real provider rather than a
 * hand-built snapshot, its requests completed by hand through the host.
 */
import type { Completion, SourceRefusal } from "@canonical/dataviews-core";
import {
  type ProviderHost,
  readProviderHost,
} from "@canonical/dataviews-core/bindings";
import { describe, expect, it } from "vitest";
import { deliverRows } from "../../../../testing/fixtures.js";
import {
  createMachineProvider,
  type Machine,
  type MachineFields,
  machine,
} from "../../../../testing/machines.js";
import areStatusesEqual from "./areStatusesEqual.js";
import deriveTableStatus from "./deriveTableStatus.js";

type Host = ProviderHost<MachineFields, Machine>;

/** A request the source accepted and could not complete. */
const failure = (reason: string): Completion<Machine> => ({
  status: "failed",
  failure: { reason, cause: new Error(reason), transient: null },
});

/** A request the source run refused before executing it. */
const refusal = (...reasons: readonly string[]): Completion<Machine> => ({
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

/** The request a query edit issued, failing loudly rather than casting. */
const pendingRequest = (host: Host): string => {
  const requestId = host.state.get().pendingRequestId;
  if (requestId === null) {
    throw new Error("expected a pending request");
  }
  return requestId;
};

/** An idle provider's host: nothing observes it, so nothing has been asked. */
const idle = (): Host => readProviderHost(createMachineProvider().provider);

/** A host whose first request was settled with `rows`. */
const loaded = (rows: readonly Machine[]): Host => {
  const host = idle();
  host.complete(host.refresh(), deliverRows(rows));
  return host;
};

describe("deriveTableStatus", () => {
  it("reports nothing displayable yet before any rows arrive", () => {
    expect(deriveTableStatus(idle().state.get())).toEqual({
      status: "loading",
    });
  });

  it("reports the failure of a request that produced no rows", () => {
    const host = idle();
    host.complete(host.refresh(), failure("the collection is unreachable"));
    expect(deriveTableStatus(host.state.get())).toEqual({
      status: "failed",
      reason: "the collection is unreachable",
    });
  });

  it("reads a refusal's reasons as one sentence", () => {
    const host = idle();
    host.complete(
      host.refresh(),
      refusal("name cannot be ordered", "two orderings at once"),
    );
    expect(deriveTableStatus(host.state.get())).toEqual({
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
    const host = loaded([]);
    expect(
      host.setPredicate({
        field: "status",
        operator: "eq",
        operands: ["failed"],
      }),
    ).toEqual([]);
    expect(deriveTableStatus(host.state.get())).toEqual({
      status: "no-results",
    });
  });

  it("reports a search that matched nothing as no results", () => {
    const { provider } = createMachineProvider();
    const host = readProviderHost(provider);
    host.complete(host.refresh(), deliverRows([]));
    expect(provider.setSearch("machine")).toEqual([]);
    expect(deriveTableStatus(host.state.get())).toEqual({
      status: "no-results",
    });
  });

  it("prefers the failure over emptiness when an empty result then failed", () => {
    const host = loaded([]);
    host.complete(host.refresh(), failure("offline"));
    expect(deriveTableStatus(host.state.get())).toEqual({
      status: "failed",
      reason: "offline",
    });
  });

  it("reports rows an earlier query produced as stale, with the reason", () => {
    const { provider } = createMachineProvider();
    const host = readProviderHost(provider);
    host.complete(host.refresh(), deliverRows([machine("m-1", "alpha")]));
    provider.setSearch("machine");
    host.complete(pendingRequest(host), failure("search is unavailable"));
    expect(host.state.get().result.status).toBe("stale");
    expect(deriveTableStatus(host.state.get())).toEqual({
      status: "stale",
      reason: "search is unavailable",
    });
  });

  it("reports a failed query with no earlier rows to keep as a failure", () => {
    const { provider } = createMachineProvider();
    const host = readProviderHost(provider);
    host.complete(host.refresh(), deliverRows([]));
    provider.setSearch("machine");
    host.complete(pendingRequest(host), failure("search is unavailable"));
    expect(host.state.get().result.status).toBe("stale");
    expect(deriveTableStatus(host.state.get())).toEqual({
      status: "failed",
      reason: "search is unavailable",
    });
  });

  it("reports rows kept through a failed refresh, with the reason", () => {
    const host = loaded([machine("m-1", "alpha")]);
    host.complete(host.refresh(), failure("offline"));
    expect(host.state.get().result.status).toBe("refresh-failed");
    expect(deriveTableStatus(host.state.get())).toEqual({
      status: "refresh-failed",
      reason: "offline",
    });
  });

  it("reports nothing at all while rows are displayed", () => {
    expect(
      deriveTableStatus(loaded([machine("m-1", "alpha")]).state.get()),
    ).toBeNull();
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
