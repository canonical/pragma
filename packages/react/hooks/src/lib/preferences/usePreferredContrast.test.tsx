import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import usePreferredContrast from "./usePreferredContrast.js";

type MatchMediaListener = (e: { matches: boolean }) => void;

let moreListeners: MatchMediaListener[];
let lessListeners: MatchMediaListener[];
let moreMatches: boolean;
let lessMatches: boolean;

beforeEach(() => {
  moreListeners = [];
  lessListeners = [];
  moreMatches = false;
  lessMatches = false;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn((query: string) => {
      const isMore = query === "(prefers-contrast: more)";
      const isLess = query === "(prefers-contrast: less)";
      return {
        get matches() {
          return (isMore && moreMatches) || (isLess && lessMatches);
        },
        media: query,
        addEventListener: (_: string, cb: MatchMediaListener) => {
          if (isMore) moreListeners.push(cb);
          if (isLess) lessListeners.push(cb);
        },
        removeEventListener: (_: string, cb: MatchMediaListener) => {
          if (isMore) moreListeners = moreListeners.filter((l) => l !== cb);
          if (isLess) lessListeners = lessListeners.filter((l) => l !== cb);
        },
      };
    }),
  });
});

afterEach(() => {
  // biome-ignore lint/suspicious/noDocumentCookie: test setup
  document.cookie = "contrast=; max-age=0";
  document.documentElement.classList.remove("more-contrast", "less-contrast");
});

describe("usePreferredContrast", () => {
  it("defaults to no-preference", () => {
    const { result } = renderHook(() => usePreferredContrast());
    expect(result.current.value).toBe("no-preference");
    expect(result.current.source).toBe("system");
  });

  it("detects system prefers-contrast: more", () => {
    moreMatches = true;
    const { result } = renderHook(() => usePreferredContrast());
    expect(result.current.value).toBe("more");
  });

  it("detects system prefers-contrast: less", () => {
    lessMatches = true;
    const { result } = renderHook(() => usePreferredContrast());
    expect(result.current.value).toBe("less");
  });

  it("applies more-contrast class", () => {
    const { result } = renderHook(() => usePreferredContrast());
    act(() => {
      result.current.set("more");
    });
    expect(document.documentElement.classList.contains("more-contrast")).toBe(
      true,
    );
  });

  it("applies less-contrast class", () => {
    const { result } = renderHook(() => usePreferredContrast());
    act(() => {
      result.current.set("less");
    });
    expect(document.documentElement.classList.contains("less-contrast")).toBe(
      true,
    );
  });

  it("applies no class for no-preference", () => {
    const { result } = renderHook(() => usePreferredContrast());
    act(() => {
      result.current.set("more");
    });
    act(() => {
      result.current.reset();
    });
    expect(document.documentElement.classList.contains("more-contrast")).toBe(
      false,
    );
    expect(document.documentElement.classList.contains("less-contrast")).toBe(
      false,
    );
  });

  it("reads from cookie", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "contrast=less";
    const { result } = renderHook(() => usePreferredContrast());
    expect(result.current.value).toBe("less");
    expect(result.current.source).toBe("stored");
  });

  it("responds to system changes when following system", () => {
    const { result } = renderHook(() => usePreferredContrast());
    expect(result.current.value).toBe("no-preference");

    act(() => {
      moreMatches = true;
      for (const listener of moreListeners) {
        listener({ matches: true });
      }
    });

    expect(result.current.value).toBe("more");
  });
});
