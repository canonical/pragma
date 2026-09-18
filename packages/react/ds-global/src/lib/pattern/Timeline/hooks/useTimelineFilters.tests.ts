import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TimelineItem } from "../types.js";
import { useTimelineFilters } from "./useTimelineFilters.js";

const items: TimelineItem[] = [
  {
    id: "1",
    dateTime: "2024-01-01T00:00:00Z",
    actorId: "jane",
    actorName: "Jane",
    eventType: "comment",
  },
  {
    id: "2",
    dateTime: "2024-01-03T00:00:00Z",
    actorId: "john",
    eventType: "approval",
  },
  {
    id: "3",
    dateTime: "2024-01-02T00:00:00Z",
    actorId: "jane",
    eventType: "comment",
  },
];

describe("useTimelineFilters", () => {
  it("infers unique actor and event options", () => {
    const { result } = renderHook(() => useTimelineFilters({ items }));
    expect(result.current.actorOptions).toEqual([
      { value: "jane", label: "Jane" },
      { value: "john", label: "john" },
    ]);
    expect(result.current.eventOptions).toEqual([
      { value: "comment", label: "comment" },
      { value: "approval", label: "approval" },
    ]);
  });

  it("sorts oldest first by default", () => {
    const { result } = renderHook(() => useTimelineFilters({ items }));
    expect(result.current.visible.map((item) => item.id)).toEqual([
      "1",
      "3",
      "2",
    ]);
    expect(result.current.sortOrder).toBe("oldest");
  });

  it("toggles to newest first", () => {
    const { result } = renderHook(() => useTimelineFilters({ items }));
    act(() => result.current.setSortOrder("newest"));
    expect(result.current.visible.map((item) => item.id)).toEqual([
      "2",
      "3",
      "1",
    ]);
  });

  it("filters by actor", () => {
    const { result } = renderHook(() => useTimelineFilters({ items }));
    act(() => result.current.setFilters({ actorId: "jane" }));
    expect(result.current.visible.map((item) => item.id)).toEqual(["1", "3"]);
  });

  it("sorts unparseable dates last regardless of order", () => {
    const withInvalid: TimelineItem[] = [
      ...items,
      { id: "4", dateTime: "not-a-date", actorId: "jane" },
    ];
    const { result } = renderHook(() =>
      useTimelineFilters({ items: withInvalid }),
    );
    expect(result.current.visible.at(-1)?.id).toBe("4");
    act(() => result.current.setSortOrder("newest"));
    expect(result.current.visible.at(-1)?.id).toBe("4");
  });

  it("respects controlled filters", () => {
    const onFiltersChange = vi.fn();
    const { result } = renderHook(() =>
      useTimelineFilters({
        items,
        filters: { actorId: "john" },
        onFiltersChange,
      }),
    );
    expect(result.current.visible.map((item) => item.id)).toEqual(["2"]);
    act(() => result.current.setFilters({ actorId: "jane" }));
    expect(onFiltersChange).toHaveBeenCalledWith({ actorId: "jane" });
    expect(result.current.filters).toEqual({ actorId: "john" });
  });

  it("respects controlled sort order", () => {
    const onSortOrderChange = vi.fn();
    const { result } = renderHook(() =>
      useTimelineFilters({ items, sortOrder: "newest", onSortOrderChange }),
    );
    act(() => result.current.setSortOrder("oldest"));
    expect(onSortOrderChange).toHaveBeenCalledWith("oldest");
    expect(result.current.sortOrder).toBe("newest");
  });

  it("starts from defaultFilters and defaultSortOrder", () => {
    const { result } = renderHook(() =>
      useTimelineFilters({
        items,
        defaultFilters: { eventType: "approval" },
        defaultSortOrder: "newest",
      }),
    );
    expect(result.current.visible.map((item) => item.id)).toEqual(["2"]);
  });
});
