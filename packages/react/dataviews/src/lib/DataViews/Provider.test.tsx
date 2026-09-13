import {
  createDataViewsProvider,
  createSchema,
  type DataViewsProvider,
} from "@canonical/dataviews-core";
import { act, render, renderHook, screen } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { describe, expect, it } from "vitest";
import useDataViews from "./hooks/useDataViews.js";
import useDataViewsValue from "./hooks/useDataViewsValue.js";
import DataViews from "./Provider.js";

const machinesSchema = () =>
  createSchema([
    { field: "status", kind: "choices", options: ["failed", "cancelled"] },
    { field: "cpu", kind: "number", min: 0, max: 64 },
    { field: "owner", kind: "flag" },
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

describe("DataViews root", () => {
  it("renders children inside the provider context", () => {
    render(
      <Root provider={machinesProvider()}>
        <span>inside the collection</span>
      </Root>,
    );
    expect(screen.getByText("inside the collection")).toBeInTheDocument();
  });

  it("throws when the provider is not a genuine DataViews provider", () => {
    expect(() =>
      render(
        <DataViews
          provider={
            { identity: "forged" } as unknown as DataViewsProvider<
              ReturnType<typeof machinesSchema>["fields"]
            >
          }
        >
          <span />
        </DataViews>,
      ),
    ).toThrow("createDataViewsProvider");
  });
});

describe("useDataViews", () => {
  it("returns the stable typed scope for the enclosing provider", () => {
    const p = machinesProvider();
    const { result } = renderHook(() => useDataViews(p), {
      wrapper: ({ children }) => <Root provider={p}>{children}</Root>,
    });
    expect(result.current.selection).toBe(p.selection);
    expect(result.current.state).toBe(p.state);
    expect(Object.keys(result.current.fields.status)).toEqual(["eq"]);
    expect(Object.keys(result.current.fields.cpu).sort()).toEqual([
      "gte",
      "lte",
    ]);
    expect(Object.keys(result.current.fields.owner)).toEqual(["isSet"]);
  });

  it("serves the same scope across re-renders", () => {
    const p = machinesProvider();
    const { result, rerender } = renderHook(() => useDataViews(p), {
      wrapper: ({ children }) => <Root provider={p}>{children}</Root>,
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("throws outside a DataViews root", () => {
    const p = machinesProvider();
    expect(() => renderHook(() => useDataViews(p))).toThrow(
      "inside a DataViews root",
    );
  });

  it("throws on a witness mismatch", () => {
    const p = machinesProvider();
    const other = machinesProvider();
    expect(() =>
      renderHook(() => useDataViews(other), {
        wrapper: ({ children }) => <Root provider={p}>{children}</Root>,
      }),
    ).toThrow("not the enclosing DataViews root's provider");
  });

  it("throws on a forged provider before reading context", () => {
    expect(() =>
      renderHook(() =>
        useDataViews(
          {} as DataViewsProvider<ReturnType<typeof machinesSchema>["fields"]>,
        ),
      ),
    ).toThrow("createDataViewsProvider");
  });

  it("is safe under StrictMode double-mount without duplicate subscriptions", () => {
    const p = machinesProvider();
    const channel = p.state;
    let notifications = 0;
    channel.subscribe(() => {
      notifications += 1;
    });
    const { result } = renderHook(() => useDataViewsValue(channel), {
      wrapper: ({ children }) => (
        <StrictMode>
          <Root provider={p}>{children}</Root>
        </StrictMode>
      ),
    });
    expect(result.current).toBe(channel.get());
    act(() => {
      p.setSearch("yak");
    });
    expect(notifications).toBe(1);
  });
});
