import { createChannel } from "@canonical/dataviews-core/bindings";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import useDataViewsValue from "./useDataViewsValue.js";

describe("useDataViewsValue", () => {
  it("returns the channel's current snapshot", () => {
    const channel = createChannel({ count: 0 });
    const { result } = renderHook(() => useDataViewsValue(channel));
    expect(result.current).toEqual({ count: 0 });
  });

  it("re-renders only when the channel publishes", () => {
    const channel = createChannel(0);
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useDataViewsValue(channel);
    });
    expect(renders).toBe(1);
    act(() => channel.set(1));
    expect(result.current).toBe(1);
    expect(renders).toBe(2);
    act(() => channel.set(1));
    expect(renders).toBe(2);
  });

  it("does not re-render when a custom equality guard rejects the set", () => {
    const channel = createChannel(
      { value: 1 },
      { equals: (a, b) => a.value === b.value },
    );
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useDataViewsValue(channel);
    });
    expect(renders).toBe(1);
    // Guard-equal write: no notification, no re-render.
    act(() => channel.set({ value: 1 }));
    expect(renders).toBe(1);
    act(() => channel.set({ value: 2 }));
    expect(result.current).toEqual({ value: 2 });
    expect(renders).toBe(2);
  });

  it("re-subscribes when the channel instance changes", () => {
    const first = createChannel(0);
    const second = createChannel(100);
    const { result, rerender } = renderHook(
      ({ channel }) => useDataViewsValue(channel),
      { initialProps: { channel: first } },
    );
    expect(result.current).toBe(0);
    rerender({ channel: second });
    expect(result.current).toBe(100);
    // The stale channel's publication must not leak through.
    act(() => first.set(5));
    expect(result.current).toBe(100);
    act(() => second.set(200));
    expect(result.current).toBe(200);
  });

  it("unsubscribes on unmount", () => {
    const channel = createChannel(0);
    let observed = 0;
    channel.subscribe(() => {
      observed += 1;
    });
    const { unmount } = renderHook(() => useDataViewsValue(channel));
    unmount();
    act(() => channel.set(1));
    // Only the surviving subscriber observed it.
    expect(observed).toBe(1);
  });
});
