import { createLocationQuery } from "@canonical/ds-utils";
import {
  createMemoryAdapter,
  createServerAdapter,
} from "@canonical/router-core";
import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import useTimelineUrlParams from "./useTimelineUrlParams.js";

function setup(initialUrl: string) {
  const adapter = createMemoryAdapter(initialUrl);
  const locationQuery = createLocationQuery(adapter);
  const href = () => {
    const url = new URL(adapter.getLocation());
    return url.pathname + url.search + url.hash;
  };
  return { adapter, locationQuery, href };
}

describe("useTimelineUrlParams", () => {
  describe("state", () => {
    it("reflects the URL on the first render", () => {
      const { locationQuery } = setup(
        "/mp/42?tl.actor=jane&tl.event=comment&tl.sort=newest",
      );
      const renders: unknown[] = [];
      renderHook(() => {
        const { state } = useTimelineUrlParams({ locationQuery });
        renders.push(state);
      });
      expect(renders[0]).toEqual({
        filters: { actorId: "jane", eventType: "comment" },
        sortOrder: "newest",
      });
      expect(renders).toHaveLength(1);
    });

    it("reflects the URL in a server render", () => {
      const locationQuery = createLocationQuery(
        createServerAdapter("/mp/42?tl.sort=newest"),
      );
      const SortOrder = () =>
        useTimelineUrlParams({ locationQuery }).state.sortOrder ?? "unset";
      expect(renderToString(createElement(SortOrder))).toBe("newest");
    });

    it("reads only the keys under the prefix", () => {
      const { locationQuery } = setup("/mp/42?tl.actor=jane&h.actor=john");
      const { result } = renderHook(() =>
        useTimelineUrlParams({ locationQuery, prefix: "h" }),
      );
      expect(result.current.state.filters.actorId).toBe("john");
    });

    it("keeps the same state object while Timeline's params are unchanged", () => {
      const { adapter, locationQuery } = setup("/mp/42?tl.actor=jane");
      const { result } = renderHook(() =>
        useTimelineUrlParams({ locationQuery }),
      );
      const before = result.current.state;
      act(() => adapter.navigate("/mp/42?tl.actor=jane&page=2"));
      expect(result.current.state).toBe(before);
    });
  });

  describe("write", () => {
    it("changes only Timeline's keys and keeps path, hash and foreign params", () => {
      const { locationQuery, href } = setup(
        "/mp/42?status=failed&tl.actor=jane&status=cancelled#files",
      );
      const { result } = renderHook(() =>
        useTimelineUrlParams({ locationQuery }),
      );
      act(() =>
        result.current.write(
          { filters: { actorId: "john" }, sortOrder: "newest" },
          "replace",
        ),
      );
      expect(href()).toBe(
        "/mp/42?status=failed&tl.actor=john&status=cancelled&tl.sort=newest#files",
      );
      expect(result.current.state).toEqual({
        filters: { actorId: "john", eventType: undefined },
        sortOrder: "newest",
      });
    });

    it("appends a history entry on push", () => {
      const { adapter, locationQuery, href } = setup("/mp/42?tl.actor=jane");
      const { result } = renderHook(() =>
        useTimelineUrlParams({ locationQuery }),
      );
      act(() => result.current.write({ filters: { actorId: "john" } }, "push"));
      act(() => adapter.back());
      expect(href()).toBe("/mp/42?tl.actor=jane");
      expect(result.current.state.filters.actorId).toBe("jane");
    });

    it("overwrites the current history entry on replace", () => {
      const { adapter, locationQuery, href } = setup("/mp/42");
      act(() => adapter.navigate("/mp/42?tl.actor=jane"));
      const { result } = renderHook(() =>
        useTimelineUrlParams({ locationQuery }),
      );
      act(() =>
        result.current.write({ filters: { actorId: "john" } }, "replace"),
      );
      act(() => adapter.back());
      expect(href()).toBe("/mp/42");
    });

    it("skips a write that changes nothing", () => {
      const { locationQuery } = setup("/mp/42?tl.actor=jane");
      const write = vi.spyOn(locationQuery, "write");
      const { result } = renderHook(() =>
        useTimelineUrlParams({ locationQuery }),
      );
      act(() => result.current.write({ filters: { actorId: "jane" } }, "push"));
      expect(write).not.toHaveBeenCalled();
    });
  });

  describe("onParams", () => {
    it("reports a navigation made outside Timeline", () => {
      const { adapter, locationQuery } = setup("/mp/42?tl.actor=jane");
      const onParams = vi.fn();
      const { result } = renderHook(() =>
        useTimelineUrlParams({ locationQuery, onParams }),
      );
      act(() => adapter.navigate("/mp/42?tl.actor=john&tl.sort=oldest"));
      expect(onParams).toHaveBeenCalledTimes(1);
      expect(onParams).toHaveBeenCalledWith({
        filters: { actorId: "john", eventType: undefined },
        sortOrder: "oldest",
      });
      expect(result.current.state.sortOrder).toBe("oldest");
    });

    it("reports Back after Timeline's own push", () => {
      const { adapter, locationQuery } = setup("/mp/42?tl.actor=jane");
      const onParams = vi.fn();
      const { result } = renderHook(() =>
        useTimelineUrlParams({ locationQuery, onParams }),
      );
      act(() => result.current.write({ filters: { actorId: "john" } }, "push"));
      act(() => adapter.back());
      expect(onParams).toHaveBeenCalledTimes(1);
      expect(onParams).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: { actorId: "jane", eventType: undefined },
        }),
      );
    });

    it("does not report Timeline's own write", () => {
      const { locationQuery } = setup("/mp/42");
      const onParams = vi.fn();
      const { result } = renderHook(() =>
        useTimelineUrlParams({ locationQuery, onParams }),
      );
      act(() => result.current.write({ filters: { actorId: "jane" } }, "push"));
      act(() =>
        result.current.write({ filters: { eventType: "comment" } }, "replace"),
      );
      expect(onParams).not.toHaveBeenCalled();
    });

    it("does not report a change to foreign params", () => {
      const { adapter, locationQuery } = setup("/mp/42?tl.actor=jane");
      const onParams = vi.fn();
      renderHook(() => useTimelineUrlParams({ locationQuery, onParams }));
      act(() => adapter.navigate("/mp/42?tl.actor=jane&page=2"));
      expect(onParams).not.toHaveBeenCalled();
    });

    it("calls the latest callback without resubscribing", () => {
      const { adapter, locationQuery } = setup("/mp/42");
      const subscribe = vi.spyOn(locationQuery, "subscribe");
      const first = vi.fn();
      const second = vi.fn();
      const { rerender } = renderHook(
        ({ onParams }: { onParams: () => void }) =>
          useTimelineUrlParams({ locationQuery, onParams }),
        { initialProps: { onParams: first } },
      );
      rerender({ onParams: second });
      act(() => adapter.navigate("/mp/42?tl.actor=jane"));
      expect(subscribe).toHaveBeenCalledTimes(1);
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it("stops listening on unmount", () => {
      const { adapter, locationQuery } = setup("/mp/42");
      const onParams = vi.fn();
      const { unmount } = renderHook(() =>
        useTimelineUrlParams({ locationQuery, onParams }),
      );
      unmount();
      adapter.navigate("/mp/42?tl.actor=jane");
      expect(onParams).not.toHaveBeenCalled();
    });
  });

  describe("without a locationQuery", () => {
    it("returns an empty state and writes nothing", () => {
      const { result } = renderHook(() => useTimelineUrlParams({}));
      expect(result.current.state).toEqual({ filters: {} });
      act(() => result.current.write({ filters: { actorId: "jane" } }, "push"));
      expect(result.current.state).toEqual({ filters: {} });
    });
  });
});
