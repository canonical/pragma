import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import usePreferredShortcuts from "./usePreferredShortcuts.js";

let matchMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Present but never expected to be called: this preference has no media
  // feature, so a call here is the bug the "consults no media query" test
  // is watching for.
  matchMedia = vi.fn((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: matchMedia,
  });
});

afterEach(() => {
  // biome-ignore lint/suspicious/noDocumentCookie: test setup
  document.cookie = "shortcuts=; path=/; max-age=0";
  // biome-ignore lint/suspicious/noDocumentCookie: test setup
  document.cookie = "kbd=; path=/; max-age=0";
});

describe("usePreferredShortcuts", () => {
  it("defaults to on, following no stored choice", () => {
    const { result } = renderHook(() => usePreferredShortcuts());
    expect(result.current.value).toBe("on");
    expect(result.current.source).toBe("system");
  });

  it("consults no media query", () => {
    renderHook(() => usePreferredShortcuts());
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it("reads off from cookie", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "shortcuts=off; path=/";
    const { result } = renderHook(() => usePreferredShortcuts());
    expect(result.current.value).toBe("off");
    expect(result.current.source).toBe("stored");
  });

  it("reads on from cookie as a stored choice", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "shortcuts=on; path=/";
    const { result } = renderHook(() => usePreferredShortcuts());
    expect(result.current.value).toBe("on");
    expect(result.current.source).toBe("stored");
  });

  it("ignores invalid cookie values and falls back to on", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "shortcuts=maybe; path=/";
    const { result } = renderHook(() => usePreferredShortcuts());
    expect(result.current.value).toBe("on");
    expect(result.current.source).toBe("system");
  });

  it("writes cookie on set", () => {
    const { result } = renderHook(() => usePreferredShortcuts());
    act(() => {
      result.current.set("off");
    });
    expect(result.current.value).toBe("off");
    expect(result.current.source).toBe("stored");
    expect(document.cookie).toContain("shortcuts=off");
  });

  it("returns to on with no stored choice on reset", () => {
    const { result } = renderHook(() => usePreferredShortcuts());
    act(() => {
      result.current.set("off");
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.value).toBe("on");
    expect(result.current.source).toBe("system");
    expect(document.cookie).not.toContain("shortcuts=");
  });

  it("applies no class on documentElement in either value", () => {
    const { result } = renderHook(() => usePreferredShortcuts());
    expect(document.documentElement.className).toBe("");
    act(() => {
      result.current.set("off");
    });
    expect(document.documentElement.className).toBe("");
    act(() => {
      result.current.set("on");
    });
    expect(document.documentElement.className).toBe("");
  });

  it("uses custom cookie name", () => {
    const { result } = renderHook(() =>
      usePreferredShortcuts({ cookieName: "kbd" }),
    );
    act(() => {
      result.current.set("off");
    });
    expect(document.cookie).toContain("kbd=off");
  });
});
