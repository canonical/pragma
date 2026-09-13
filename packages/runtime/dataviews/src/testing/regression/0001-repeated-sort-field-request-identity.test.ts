/**
 * Regression: an ordering that spells one field twice must be the same
 * request as the ordering that spells it once.
 *
 * Before the fix, `sort=cpu__asc&sort=cpu__desc` survived canonicalization,
 * a `setSort` command and a decode: the coordinator held both terms, the
 * fingerprint differed from `[cpu asc]`, a source with a one-term limit
 * refused it as two terms, and the location was written back with both.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare, declareSort } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createQueryCoordinator } from "../../lib/coordinator/index.js";
import { createMemoryLocation } from "../../lib/location/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";
import {
  DEFAULT_WINDOW,
  EMPTY_SLICE,
  type SortTerm,
} from "../../lib/query/index.js";
import { refusalsOf } from "../../lib/source/index.js";

const machines = createCollection({
  identify: byId,
  fields: [
    { field: "cpu", kind: "number" },
    { field: "name", kind: "text" },
  ],
});

const once: readonly SortTerm[] = [{ field: "cpu", direction: "asc" }];
const twice: readonly SortTerm[] = [
  { field: "cpu", direction: "asc" },
  { field: "cpu", direction: "desc" },
];

describe("regression 0001 — a repeated sort field keeps one request identity", () => {
  it("holds the ordering a command respells as the ordering it means", () => {
    const coordinator = createQueryCoordinator({
      slice: { ...EMPTY_SLICE, sort: [{ field: "name", direction: "asc" }] },
    });
    coordinator.dispatch({ kind: "setSort", sort: twice });
    expect(coordinator.state.slice.sort).toEqual(once);
  });

  it("issues no new request for the respelling of the ordering in force", () => {
    const coordinator = createQueryCoordinator({
      slice: { ...EMPTY_SLICE, sort: once },
    });
    coordinator.refresh();
    const result = coordinator.dispatch({ kind: "setSort", sort: twice });
    expect(result.status).toBe("accepted");
    expect(result.requestId).toBeNull();
  });

  it("counts the field once against a source's term limit", () => {
    expect(
      refusalsOf(declare({ sort: declareSort(["cpu"], 1) }), {
        slice: { ...EMPTY_SLICE, sort: twice },
        window: DEFAULT_WINDOW,
      }),
    ).toEqual([]);
  });

  it("adopts a respelled location as the ordering it means and writes it back once", () => {
    const location = createMemoryLocation({
      href: "/machines?sort=cpu__asc&sort=cpu__desc",
    });
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({
        capabilities: declare({ sort: declareSort(["cpu"], 1) }),
      }).source,
      location,
    });
    const release = provider.observe();
    expect(provider.state.get().slice.sort).toEqual(once);
    expect(location.read().getAll("sort")).toEqual(["cpu__asc"]);
    release();
  });
});
