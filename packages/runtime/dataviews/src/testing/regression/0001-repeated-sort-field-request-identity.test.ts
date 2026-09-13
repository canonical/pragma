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
import {
  declareCapabilities,
  declareSorting,
} from "../../../testing/fixtures.js";
import { createCollectionCoordinator } from "../../lib/collection/index.js";
import {
  createLocationBinding,
  createMemoryLocation,
} from "../../lib/location/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";
import {
  DEFAULT_WINDOW,
  EMPTY_SLICE,
  type SortTerm,
} from "../../lib/query/index.js";
import { createSchema } from "../../lib/schema/index.js";
import { supportsRequest } from "../../lib/source/index.js";

const schema = createSchema([
  { field: "cpu", kind: "number" },
  { field: "name", kind: "text" },
]);

const once: readonly SortTerm[] = [{ field: "cpu", direction: "asc" }];
const twice: readonly SortTerm[] = [
  { field: "cpu", direction: "asc" },
  { field: "cpu", direction: "desc" },
];

describe("regression 0001 — a repeated sort field keeps one request identity", () => {
  it("holds the ordering a command respells as the ordering it means", () => {
    const coordinator = createCollectionCoordinator({
      slice: { ...EMPTY_SLICE, sort: [{ field: "name", direction: "asc" }] },
    });
    coordinator.dispatch({ kind: "setSort", sort: twice });
    expect(coordinator.state.slice.sort).toEqual(once);
  });

  it("issues no new request for the respelling of the ordering in force", () => {
    const coordinator = createCollectionCoordinator({
      slice: { ...EMPTY_SLICE, sort: once },
    });
    coordinator.refresh();
    const result = coordinator.dispatch({ kind: "setSort", sort: twice });
    expect(result.status).toBe("accepted");
    expect(result.requestId).toBeNull();
  });

  it("counts the field once against a source's term limit", () => {
    expect(
      supportsRequest(
        declareCapabilities({ sort: declareSorting(["cpu"], 1) }),
        { slice: { ...EMPTY_SLICE, sort: twice }, window: DEFAULT_WINDOW },
      ),
    ).toEqual([]);
  });

  it("adopts a respelled location as the ordering it means and writes it back once", () => {
    const provider = createDataViewsProvider({ schema });
    const location = createMemoryLocation({
      href: "/machines?sort=cpu__asc&sort=cpu__desc",
    });
    const release = createLocationBinding({
      host: provider,
      location,
    }).observe();
    expect(provider.state.get().slice.sort).toEqual(once);
    expect(location.read().getAll("sort")).toEqual(["cpu__asc"]);
    release();
  });
});
