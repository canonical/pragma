/**
 * One filter of the enclosing root, bound by collection, field and
 * operator: its edits reach the provider's applied query through the root's
 * own record, its applied value is typed by the field's kind, and it
 * re-renders for its own filter and nothing else.
 */
import {
  createCollection,
  type EmptyOr,
  type PredicateOperator,
} from "@canonical/dataviews-core";
import { readProviderHost } from "@canonical/dataviews-core/bindings";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  createMachineProvider,
  type MachineFixture,
  machines,
} from "../../../../../testing/machines.js";
import DataViews from "../Provider.js";
import useDataViewsFilter from "./useDataViewsFilter.js";

/** A wrapper for renderHook, over one root. */
const inRoot =
  ({ provider }: MachineFixture) =>
  ({ children }: { children: ReactNode }) => (
    <DataViews provider={provider}>{children}</DataViews>
  );

/** Another collection, over which the machine provider was not built. */
const racks = createCollection({
  identify: (rack: { readonly id: string }) => rack.id,
  fields: [{ field: "cores", kind: "number" }],
});

describe("useDataViewsFilter", () => {
  it("binds input, applied and feedback with edit routed through the provider", () => {
    const machineProvider = createMachineProvider();
    const { provider } = machineProvider;
    const { result } = renderHook(
      () => useDataViewsFilter(machines, "cores", "gte"),
      { wrapper: inRoot(machineProvider) },
    );
    expect(result.current.input).toBe("");
    expect(result.current.applied).toEqual({ kind: "empty" });
    expect(result.current.feedback).toEqual({ status: "none" });

    act(() => {
      result.current.edit("4");
    });
    expect(result.current.input).toBe("4");
    expect(result.current.applied).toEqual({ kind: "value", value: 4 });
    expect(result.current.feedback).toEqual({ status: "applied" });
    // The edit reached the provider's query, and a request went out for it.
    expect(provider.state.get().slice.filter).toEqual([
      { field: "cores", operator: "gte", operands: [4] },
    ]);
    expect(machineProvider.source.latest().request.slice.filter).toEqual([
      { field: "cores", operator: "gte", operands: [4] },
    ]);
  });

  it("types the applied value by the field's kind", () => {
    const machineProvider = createMachineProvider();
    const { result } = renderHook(
      () => ({
        cores: useDataViewsFilter(machines, "cores", "lte"),
        status: useDataViewsFilter(machines, "status", "eq"),
      }),
      { wrapper: inRoot(machineProvider) },
    );
    expectTypeOf(result.current.cores.applied).toEqualTypeOf<EmptyOr<number>>();
    expectTypeOf(result.current.status.applied).toEqualTypeOf<
      EmptyOr<ReadonlySet<"failed" | "running">>
    >();
    // A text field has no operator, and a number no equality: neither is an
    // address, so neither compiles. Never called: the check is the compiler's.
    const rejectedAddresses = (): void => {
      // @ts-expect-error name is ordered, never filtered
      useDataViewsFilter(machines, "name", "eq");
      // @ts-expect-error a number is bounded, never equal
      useDataViewsFilter(machines, "cores", "eq");
    };
    expect(rejectedAddresses).toBeTypeOf("function");
    act(() => {
      result.current.status.set(["failed"]);
    });
    expect(result.current.status.applied).toEqual({
      kind: "value",
      value: new Set(["failed"]),
    });
  });

  it("shows invalid feedback and retains the predicate", () => {
    const machineProvider = createMachineProvider();
    const { provider } = machineProvider;
    const { result } = renderHook(
      () => useDataViewsFilter(machines, "cores", "gte"),
      { wrapper: inRoot(machineProvider) },
    );
    act(() => {
      result.current.edit("4");
    });
    act(() => {
      result.current.edit("four");
    });
    expect(result.current.input).toBe("four");
    expect(result.current.feedback).toEqual({
      status: "invalid",
      reason: "not a number",
      retainsPredicate: true,
    });
    expect(result.current.applied).toEqual({ kind: "value", value: 4 });
    expect(provider.state.get().slice.filter).toEqual([
      { field: "cores", operator: "gte", operands: [4] },
    ]);
  });

  it("clears the predicate through the binding", () => {
    const machineProvider = createMachineProvider();
    const { provider } = machineProvider;
    const { result } = renderHook(
      () => useDataViewsFilter(machines, "cores", "gte"),
      { wrapper: inRoot(machineProvider) },
    );
    act(() => {
      result.current.edit("4");
    });
    let refusals: readonly unknown[] = [];
    act(() => {
      refusals = result.current.clear();
    });
    expect(refusals).toEqual([]);
    expect(result.current.input).toBe("");
    expect(result.current.applied).toEqual({ kind: "empty" });
    expect(result.current.feedback).toEqual({ status: "none" });
    expect(provider.state.get().slice.filter).toEqual([]);
  });

  it("sets multi-value operands through the binding", () => {
    const machineProvider = createMachineProvider();
    const { provider } = machineProvider;
    const { result } = renderHook(
      () => useDataViewsFilter(machines, "status", "eq"),
      { wrapper: inRoot(machineProvider) },
    );
    act(() => {
      result.current.set(["failed", "running"]);
    });
    expect(result.current.applied).toEqual({
      kind: "value",
      value: new Set(["failed", "running"]),
    });
    expect(provider.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed", "running"] },
    ]);
  });

  it("re-binds when the address changes", () => {
    const machineProvider = createMachineProvider();
    const { result, rerender } = renderHook(
      ({ bound }: { bound: "gte" | "lte" }) =>
        useDataViewsFilter(machines, "cores", bound),
      {
        initialProps: { bound: "gte" },
        wrapper: inRoot(machineProvider),
      },
    );
    act(() => {
      result.current.edit("4");
    });
    expect(result.current.applied).toEqual({ kind: "value", value: 4 });
    rerender({ bound: "lte" });
    expect(result.current.input).toBe("");
    expect(result.current.applied).toEqual({ kind: "empty" });
    rerender({ bound: "gte" });
    expect(result.current.input).toBe("4");
  });

  it("follows the query when it moves under the record", () => {
    const machineProvider = createMachineProvider();
    const { provider } = machineProvider;
    const { result } = renderHook(
      () => useDataViewsFilter(machines, "cores", "gte"),
      { wrapper: inRoot(machineProvider) },
    );
    act(() => {
      readProviderHost(provider).setPredicate({
        field: "cores",
        operator: "gte",
        operands: [16],
      });
    });
    // Adopted, not edited: the input shows it and the feedback says nothing.
    expect(result.current.input).toBe("16");
    expect(result.current.applied).toEqual({ kind: "value", value: 16 });
    expect(result.current.feedback).toEqual({ status: "none" });
  });

  it("re-renders only when its own filter publishes", () => {
    const machineProvider = createMachineProvider();
    const { provider } = machineProvider;
    let renders = 0;
    const { result } = renderHook(
      () => {
        renders += 1;
        return useDataViewsFilter(machines, "cores", "gte");
      },
      { wrapper: inRoot(machineProvider) },
    );
    const mounted = renders;
    // Another filter, the search and the selection move; this one does not.
    act(() => {
      readProviderHost(provider).setPredicate({
        field: "status",
        operator: "eq",
        operands: ["failed"],
      });
      provider.setSearch("alpha");
      provider.selection.add(["m1"]);
    });
    expect(renders).toBe(mounted);
    act(() => {
      result.current.edit("8");
    });
    expect(renders).toBe(mounted + 1);
  });

  it("throws outside a DataViews root", () => {
    expect(() =>
      renderHook(() => useDataViewsFilter(machines, "cores", "gte")),
    ).toThrow("useDataViewsFilter must be used inside a DataViews root");
  });

  it("throws on a witness mismatch", () => {
    const machineProvider = createMachineProvider();
    expect(() =>
      renderHook(() => useDataViewsFilter(racks, "cores", "gte"), {
        wrapper: inRoot(machineProvider),
      }),
    ).toThrow(
      "useDataViewsFilter was passed a collection that is not the one the enclosing DataViews root's provider was built over",
    );
  });

  it("throws on an address the root holds no filter for", () => {
    const machineProvider = createMachineProvider();
    // Off the schema at runtime, as a JavaScript caller may spell it.
    const field: string = "zone";
    const operator: PredicateOperator = "eq";
    expect(() =>
      renderHook(() => useDataViewsFilter(machines, field as "cores", "gte"), {
        wrapper: inRoot(machineProvider),
      }),
    ).toThrow("the root holds no filter for zone gte");
    expect(() =>
      renderHook(
        () => useDataViewsFilter(machines, "cores", operator as "gte"),
        { wrapper: inRoot(machineProvider) },
      ),
    ).toThrow("the root holds no filter for cores eq");
  });
});
