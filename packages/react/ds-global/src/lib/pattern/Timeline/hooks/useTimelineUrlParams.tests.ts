import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  useTimelineUrlParams,
  writeTimelineUrlParams,
} from "./useTimelineUrlParams.js";

function replaceSearch(search: string): void {
  window.history.replaceState(window.history.state, "", `/${search}`);
}

describe("useTimelineUrlParams", () => {
  afterEach(() => {
    replaceSearch("");
  });

  it("reads filters and sort from the URL on mount", () => {
    replaceSearch("?tl.actor=jane&tl.event=comment&tl.sort=newest");
    const onParams = vi.fn();
    renderHook(() => useTimelineUrlParams({ enabled: true, onParams }));
    expect(onParams).toHaveBeenCalledWith(
      {
        filters: { actorId: "jane", eventType: "comment" },
        sortOrder: "newest",
      },
      "mount",
    );
  });

  it("ignores unknown sort values", () => {
    replaceSearch("?tl.sort=sideways");
    const onParams = vi.fn();
    renderHook(() => useTimelineUrlParams({ enabled: true, onParams }));
    expect(onParams).toHaveBeenLastCalledWith(
      {
        filters: { actorId: undefined, eventType: undefined },
        sortOrder: undefined,
      },
      "mount",
    );
  });

  it("does nothing when disabled", () => {
    const onParams = vi.fn();
    renderHook(() => useTimelineUrlParams({ enabled: false, onParams }));
    expect(onParams).not.toHaveBeenCalled();
  });

  it("does not re-read when the callback identity changes", () => {
    replaceSearch("?tl.actor=jane");
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ cb }: { cb: typeof first }) =>
        useTimelineUrlParams({ enabled: true, onParams: cb }),
      { initialProps: { cb: first } },
    );
    expect(first).toHaveBeenCalledTimes(1);
    rerender({ cb: second });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it("re-reads on popstate and reports the source", () => {
    replaceSearch("?tl.actor=jane");
    const onParams = vi.fn();
    renderHook(() => useTimelineUrlParams({ enabled: true, onParams }));
    replaceSearch("?tl.actor=john");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(onParams).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: { actorId: "john", eventType: undefined },
      }),
      "popstate",
    );
  });
});

describe("writeTimelineUrlParams", () => {
  afterEach(() => {
    replaceSearch("");
  });

  it("writes filter and sort params", () => {
    replaceSearch("");
    writeTimelineUrlParams("tl", {
      filters: { actorId: "jane", eventType: "comment" },
      sortOrder: "newest",
    });
    expect(window.location.search).toBe(
      "?tl.actor=jane&tl.event=comment&tl.sort=newest",
    );
  });

  it("removes params for cleared values", () => {
    replaceSearch("?tl.actor=jane&tl.sort=newest&other=1");
    writeTimelineUrlParams("tl", {
      filters: { actorId: undefined, eventType: undefined },
      sortOrder: undefined,
    });
    expect(window.location.search).toBe("?other=1");
  });

  it("namespaces keys with the given prefix", () => {
    replaceSearch("");
    writeTimelineUrlParams("history", {
      filters: { actorId: "jane", eventType: undefined },
      sortOrder: undefined,
    });
    expect(window.location.search).toBe("?history.actor=jane");
  });

  it("keeps the current history entry in the default replace mode", () => {
    replaceSearch("");
    const before = window.history.length;
    writeTimelineUrlParams("tl", {
      filters: { actorId: "jane", eventType: undefined },
      sortOrder: undefined,
    });
    expect(window.history.length).toBe(before);
    expect(window.location.search).toBe("?tl.actor=jane");
  });

  it("adds a history entry in push mode", () => {
    replaceSearch("");
    const before = window.history.length;
    writeTimelineUrlParams(
      "tl",
      {
        filters: { actorId: "jane", eventType: undefined },
        sortOrder: undefined,
      },
      "push",
    );
    expect(window.history.length).toBe(before + 1);
    expect(window.location.search).toBe("?tl.actor=jane");
  });
});
