import type { DataViewsProvider } from "@canonical/dataviews-core";
import {
  createDataViewsProvider,
  createSchema,
} from "@canonical/dataviews-core";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import DataViews from "../Provider.js";
import useDataViewsField from "./useDataViewsField.js";

const machinesSchema = () =>
  createSchema([
    { field: "status", kind: "choices", options: ["failed", "cancelled"] },
    { field: "cpu", kind: "number", min: 0, max: 64 },
  ]);

const machinesProvider = () =>
  createDataViewsProvider({ schema: machinesSchema() });

const Root = ({
  provider,
  children,
}: {
  provider: DataViewsProvider<ReturnType<typeof machinesSchema>["fields"]>;
  children?: ReactNode;
}) => <DataViews provider={provider}>{children}</DataViews>;

describe("useDataViewsField", () => {
  it("binds input, applied and feedback with edit routed through the provider", () => {
    const p = machinesProvider();
    const { result } = renderHook(() => useDataViewsField(p.fields.cpu.gte), {
      wrapper: ({ children }) => <Root provider={p}>{children}</Root>,
    });
    expect(result.current.input).toBe("");
    expect(result.current.applied).toEqual({ kind: "empty" });

    act(() => {
      result.current.edit("4");
    });
    expect(result.current.input).toBe("4");
    expect(result.current.applied).toEqual({ kind: "value", value: 4 });
    expect(result.current.feedback).toEqual({ status: "applied" });
    // The edit dispatched through the coordinator.
    expect(p.state.get().slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
  });

  it("shows invalid feedback and retains the predicate", () => {
    const p = machinesProvider();
    const { result } = renderHook(() => useDataViewsField(p.fields.cpu.gte), {
      wrapper: ({ children }) => <Root provider={p}>{children}</Root>,
    });
    act(() => {
      result.current.edit("4");
    });
    act(() => {
      result.current.edit("four");
    });
    expect(result.current.feedback).toEqual({
      status: "invalid",
      reason: "not a number",
      retainsPredicate: true,
    });
    expect(p.state.get().slice.filter).toEqual([
      { field: "cpu", operator: "gte", operands: [4] },
    ]);
  });

  it("clears the predicate through the binding", () => {
    const p = machinesProvider();
    const { result } = renderHook(() => useDataViewsField(p.fields.cpu.gte), {
      wrapper: ({ children }) => <Root provider={p}>{children}</Root>,
    });
    act(() => {
      result.current.edit("4");
    });
    act(() => {
      result.current.clear();
    });
    expect(result.current.input).toBe("");
    expect(result.current.applied).toEqual({ kind: "empty" });
    expect(p.state.get().slice.filter).toEqual([]);
  });

  it("re-binds when the handle changes", () => {
    const p = machinesProvider();
    const { result, rerender } = renderHook(
      ({ which }) =>
        useDataViewsField(
          which === "gte" ? p.fields.cpu.gte : p.fields.cpu.lte,
        ),
      {
        initialProps: { which: "gte" },
        wrapper: ({ children }) => <Root provider={p}>{children}</Root>,
      },
    );
    act(() => {
      result.current.edit("4");
    });
    expect(result.current.applied).toEqual({ kind: "value", value: 4 });
    rerender({ which: "lte" });
    expect(result.current.input).toBe("");
    expect(result.current.applied).toEqual({ kind: "empty" });
  });

  it("sets multi-value operands through the binding", () => {
    const p = machinesProvider();
    const { result } = renderHook(() => useDataViewsField(p.fields.status.eq), {
      wrapper: ({ children }) => <Root provider={p}>{children}</Root>,
    });
    act(() => {
      result.current.set(["failed", "cancelled"]);
    });
    expect(result.current.applied).toEqual({
      kind: "value",
      value: new Set(["failed", "cancelled"]),
    });
    expect(p.state.get().slice.filter).toEqual([
      { field: "status", operator: "eq", operands: ["failed", "cancelled"] },
    ]);
  });
});
