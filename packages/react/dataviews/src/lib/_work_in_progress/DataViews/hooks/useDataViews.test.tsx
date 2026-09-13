/**
 * The typed collection scope: the collection is the witness, so a child in
 * the wrong root, or in none, is told so rather than handed another
 * collection's records; what it is handed is read-only and commands the
 * shared query.
 */
import {
  type ActionRun,
  createCollection,
  createDataViewsProvider,
  declareCapabilities,
  type SourceActionRunner,
} from "@canonical/dataviews-core";
import { act, renderHook } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import createManualSource from "../../../../../testing/createManualSource.js";
import { COUNTED_EXACTLY } from "../../../../../testing/fixtures.js";
import {
  createMachineProvider,
  type MachineProvider,
  machines,
} from "../../../../../testing/machines.js";
import DataViews from "../Provider.js";
import useDataViews from "./useDataViews.js";
import useDataViewsValue from "./useDataViewsValue.js";

/** A wrapper for renderHook, over one root. */
const inRoot =
  (provider: MachineProvider) =>
  ({ children }: { children: ReactNode }) => (
    <DataViews provider={provider}>{children}</DataViews>
  );

/** Another collection, over which the machine provider was not built. */
const racks = createCollection({
  identify: (rack: { readonly id: string }) => rack.id,
  fields: [{ field: "zone", kind: "choices", options: ["a", "b"] }],
});

describe("useDataViews", () => {
  it("returns the stable typed scope for the enclosing provider", () => {
    const { provider } = createMachineProvider();
    const { result } = renderHook(() => useDataViews(machines), {
      wrapper: inRoot(provider),
    });
    expect(result.current.collection).toBe(machines);
    expect(result.current.capabilities).toBe(provider.capabilities);
    expect(result.current.selection).toBe(provider.selection);
    expect(result.current.state).toBe(provider.state);
    expect(result.current.rows).toBe(provider.rows);
    expect(result.current.issues).toBe(provider.issues);
    expect(result.current.views).toBeNull();
    expect(result.current.setSort).toBe(provider.setSort);
    expect(result.current.runAction).toBe(provider.runAction);
    // One handle per field and legal operator; text is ordered, not filtered.
    expect(Object.keys(result.current.filters.status)).toEqual(["eq"]);
    expect(Object.keys(result.current.filters.cores).sort()).toEqual([
      "gte",
      "lte",
    ]);
    expect(Object.keys(result.current.filters)).toEqual(["status", "cores"]);
  });

  it("hands out channels that cannot be published on", () => {
    const { provider } = createMachineProvider();
    const { result } = renderHook(() => useDataViews(machines), {
      wrapper: inRoot(provider),
    });
    for (const channel of [
      result.current.state,
      result.current.rows,
      result.current.issues,
      result.current.selection.state,
    ]) {
      expect(channel).not.toHaveProperty("set");
      expect(Object.isFrozen(channel)).toBe(true);
    }
    expect(result.current).not.toHaveProperty("observe");
    expect(result.current).not.toHaveProperty("reset");
  });

  it("serves the same scope across re-renders", () => {
    const { provider } = createMachineProvider();
    const { result, rerender } = renderHook(() => useDataViews(machines), {
      wrapper: inRoot(provider),
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("throws outside a DataViews root", () => {
    expect(() => renderHook(() => useDataViews(machines))).toThrow(
      "useDataViews must be used inside a DataViews root",
    );
  });

  it("throws on a witness mismatch", () => {
    const { provider } = createMachineProvider();
    expect(() =>
      renderHook(() => useDataViews(racks), {
        wrapper: inRoot(provider),
      }),
    ).toThrow(
      "useDataViews was passed a collection that is not the one the enclosing DataViews root's provider was built over",
    );
    // A root over another collection is the same mismatch from the other side.
    const rackProvider = createDataViewsProvider({
      collection: racks,
      source: createManualSource<{ readonly id: string }>({
        capabilities: declareCapabilities(racks, {}),
      }).source,
    });
    expect(() =>
      renderHook(() => useDataViews(machines), {
        wrapper: ({ children }) => (
          <DataViews provider={rackProvider}>{children}</DataViews>
        ),
      }),
    ).toThrow("not the one the enclosing DataViews root's provider");
  });

  it("commands the shared query through the scope", () => {
    const { provider, source } = createMachineProvider();
    const { result } = renderHook(() => useDataViews(machines), {
      wrapper: inRoot(provider),
    });
    let refusals: readonly unknown[] = [];
    act(() => {
      refusals = result.current.setSearch("alpha");
    });
    expect(refusals).toEqual([]);
    expect(provider.state.get().slice.search).toBe("alpha");
    // The source declares no sort on cores, so the command is refused whole.
    act(() => {
      refusals = result.current.setSort([{ field: "cores", direction: "asc" }]);
    });
    expect(refusals).not.toHaveLength(0);
    expect(provider.state.get().slice.sort).toEqual([]);
    act(() => {
      result.current.filters.status.eq.set(["failed"]);
    });
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed"] },
    ]);
    expect(source.latest().request.slice.search).toBe("alpha");
  });

  it("runs a declared action over the selection through the source", async () => {
    const runAction = vi.fn<SourceActionRunner>(async ({ targets }) =>
      targets.kind === "explicit"
        ? targets.ids.map((target) =>
            target === "m2"
              ? { target, status: "failed", reason: "still booting" }
              : { target, status: "succeeded" },
          )
        : [],
    );
    const { provider } = createMachineProvider({
      capabilities: declareCapabilities(machines, {
        filter: { status: ["eq"], cores: ["gte", "lte"] },
        search: ["name"],
        counts: COUNTED_EXACTLY,
        actions: { stop: { targets: "explicit", limit: null } },
      }),
      runAction,
    });
    const { result } = renderHook(() => useDataViews(machines), {
      wrapper: inRoot(provider),
    });
    act(() => {
      provider.selection.add(["m1", "m2"]);
    });
    let run: ActionRun | undefined;
    await act(async () => {
      run = await result.current.runAction({ action: "stop" });
    });
    if (run === undefined) {
      throw new Error("expected the run to settle");
    }
    expect(runAction).toHaveBeenCalledTimes(1);
    expect(runAction.mock.calls[0]?.[0]).toEqual({
      action: "stop",
      targets: { kind: "explicit", ids: ["m1", "m2"] },
      payload: undefined,
    });
    // Settled, with one failure: the run as a whole is reported failed.
    expect(run.status).toBe("failed");
    expect(run.succeeded).toEqual(["m1"]);
    expect(run.failed).toEqual([{ target: "m2", reason: "still booting" }]);
    // The successful target left the selection; the failure stays for review.
    expect([...provider.selection.state.get().ids]).toEqual(["m2"]);
    await expect(
      result.current.runAction({ action: "reboot" }),
    ).rejects.toThrow('"reboot"');
  });

  it("reads through StrictMode's double mount: one live execution, values that follow", () => {
    const { provider, source } = createMachineProvider();
    const { result } = renderHook(
      () => useDataViewsValue(useDataViews(machines).state),
      {
        wrapper: ({ children }) => (
          <StrictMode>
            <DataViews provider={provider}>{children}</DataViews>
          </StrictMode>
        ),
      },
    );
    // The rehearsal's observation released; the kept one holds the source.
    expect(source.calls.filter((call) => call.releases === 0)).toHaveLength(1);
    expect(result.current).toBe(provider.state.get());
    act(() => {
      provider.setSearch("yak");
    });
    expect(result.current).toBe(provider.state.get());
    expect(result.current.slice.search).toBe("yak");
  });
});
