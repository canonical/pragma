import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import usePreferredMotion from "./usePreferredMotion.js";

type MatchMediaListener = (e: { matches: boolean }) => void;

let reduceListeners: MatchMediaListener[];
let reduceMatches: boolean;

beforeEach(() => {
  reduceListeners = [];
  reduceMatches = false;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn((query: string) => {
      const isReduce = query === "(prefers-reduced-motion: reduce)";
      return {
        get matches() {
          return isReduce && reduceMatches;
        },
        media: query,
        addEventListener: (_: string, cb: MatchMediaListener) => {
          if (isReduce) reduceListeners.push(cb);
        },
        removeEventListener: (_: string, cb: MatchMediaListener) => {
          if (isReduce)
            reduceListeners = reduceListeners.filter((l) => l !== cb);
        },
      };
    }),
  });
});

afterEach(() => {
  // biome-ignore lint/suspicious/noDocumentCookie: test setup
  document.cookie = "motion=; max-age=0";
  document.documentElement.classList.remove("reduce-motion");
});

describe("usePreferredMotion", () => {
  it("defaults to no-preference", () => {
    const { result } = renderHook(() => usePreferredMotion());
    expect(result.current.value).toBe("no-preference");
    expect(result.current.source).toBe("system");
  });

  it("detects system prefers-reduced-motion", () => {
    reduceMatches = true;
    const { result } = renderHook(() => usePreferredMotion());
    expect(result.current.value).toBe("reduce");
  });

  it("applies reduce-motion class", () => {
    const { result } = renderHook(() => usePreferredMotion());
    act(() => {
      result.current.set("reduce");
    });
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(
      true,
    );
  });

  it("removes class on reset", () => {
    const { result } = renderHook(() => usePreferredMotion());
    act(() => {
      result.current.set("reduce");
    });
    act(() => {
      result.current.reset();
    });
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(
      false,
    );
  });

  it("reads from cookie", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "motion=reduce";
    const { result } = renderHook(() => usePreferredMotion());
    expect(result.current.value).toBe("reduce");
    expect(result.current.source).toBe("stored");
  });

  it("writes cookie on set", () => {
    const { result } = renderHook(() => usePreferredMotion());
    act(() => {
      result.current.set("reduce");
    });
    expect(document.cookie).toContain("motion=reduce");
  });

  it("responds to system changes when following system", () => {
    const { result } = renderHook(() => usePreferredMotion());
    expect(result.current.value).toBe("no-preference");

    act(() => {
      reduceMatches = true;
      for (const listener of reduceListeners) {
        listener({ matches: true });
      }
    });

    expect(result.current.value).toBe("reduce");
  });

  it("uses custom cookie name", () => {
    const { result } = renderHook(() =>
      usePreferredMotion({ cookieName: "reduced-motion" }),
    );
    act(() => {
      result.current.set("reduce");
    });
    expect(document.cookie).toContain("reduced-motion=reduce");
  });
});
