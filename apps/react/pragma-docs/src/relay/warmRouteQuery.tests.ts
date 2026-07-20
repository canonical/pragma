/**
 * The prefetch seam's contract (P-5, shared by every lens route): warm only
 * when a browser environment is published, never refetch what the store can
 * already fulfil, and collapse rapid repeat warms into one request.
 *
 * Driven through a REAL `RouteQueryEntry` (the playground's compiled
 * operation + variables builder) against real `createEnvironment` instances
 * — the only test double is the never-settling fetch spy, so "one fetch"
 * means one actual network dispatch.
 */

import type { FetchFunction, RequestParameters } from "relay-runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { definitionsRouteEntry } from "#domains/lenses/definitions/definitionsQuery.js";
import componentProbeRecords from "#domains/playground/__fixtures__/componentProbeRecords.js";
import {
  componentProbeQueryNode,
  componentProbeVariables,
} from "#domains/playground/probeQuery.js";
import { createEnvironment } from "./environment.js";
import { setPrefetchEnvironment } from "./prefetchEnvironment.js";
import type { RouteQueryEntry } from "./routeQuery.js";
import { warmRouteQuery } from "./warmRouteQuery.js";

/** A fetch spy that never settles: any call means "the network was hit". */
const createFetchSpy = () =>
  vi.fn(() => new Promise<never>(() => {})) as ReturnType<typeof vi.fn> &
    FetchFunction;

const entry: RouteQueryEntry = {
  query: componentProbeQueryNode,
  variables: componentProbeVariables,
};

afterEach(() => {
  // The holder is module state shared across this file's tests.
  setPrefetchEnvironment(undefined);
});

describe("warmRouteQuery", () => {
  it("is a no-op when no prefetch environment is published (the SSR posture)", () => {
    expect(() => warmRouteQuery(entry, {}, {})).not.toThrow();
  });

  it("fetches exactly once against a cold store", () => {
    const fetchFn = createFetchSpy();
    setPrefetchEnvironment(createEnvironment({ fetchFn }));

    warmRouteQuery(entry, {}, {});

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("does not fetch when the store already fulfils the operation (the check guard)", () => {
    const fetchFn = createFetchSpy();
    setPrefetchEnvironment(
      createEnvironment({ records: componentProbeRecords, fetchFn }),
    );

    warmRouteQuery(entry, {}, {});

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("collapses two rapid warms into one request (in-flight dedupe)", () => {
    const fetchFn = createFetchSpy();
    setPrefetchEnvironment(createEnvironment({ fetchFn }));

    warmRouteQuery(entry, {}, {});
    warmRouteQuery(entry, {}, {});

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

/** The spy's first dispatch: Relay's `(request, variables, …)` call. */
const firstDispatch = (
  fetchFn: ReturnType<typeof createFetchSpy>,
): readonly [RequestParameters, unknown] => {
  const call = fetchFn.mock.calls.at(0);
  if (call === undefined) throw new Error("fetch spy was never called");
  return call as unknown as readonly [RequestParameters, unknown];
};

describe("warmRouteQuery with the definitions entry (the hover-prefetch cold path)", () => {
  it("cold-fetches DefinitionsExplorerQuery exactly once with the term variables", () => {
    const fetchFn = createFetchSpy();
    setPrefetchEnvironment(createEnvironment({ fetchFn }));

    warmRouteQuery(definitionsRouteEntry, { term: "ds:UIBlock" }, {});

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [request, variables] = firstDispatch(fetchFn);
    expect(request.name).toBe("DefinitionsExplorerQuery");
    expect(variables).toEqual({ uri: "ds:UIBlock", hasTerm: true });
  });

  it("cold-fetches the term-less `/definitions` shape: { uri: '', hasTerm: false }", () => {
    const fetchFn = createFetchSpy();
    setPrefetchEnvironment(createEnvironment({ fetchFn }));

    warmRouteQuery(definitionsRouteEntry, {}, {});

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [request, variables] = firstDispatch(fetchFn);
    expect(request.name).toBe("DefinitionsExplorerQuery");
    expect(variables).toEqual({ uri: "", hasTerm: false });
  });
});
