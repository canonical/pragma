import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import usePreferredTheme from "./usePreferredTheme.js";

type MatchMediaListener = (e: { matches: boolean }) => void;

let darkListeners: MatchMediaListener[];
let darkMatches: boolean;

beforeEach(() => {
  darkListeners = [];
  darkMatches = false;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn((query: string) => ({
      get matches() {
        return query === "(prefers-color-scheme: dark)" && darkMatches;
      },
      media: query,
      addEventListener: (_: string, cb: MatchMediaListener) => {
        if (query === "(prefers-color-scheme: dark)") darkListeners.push(cb);
      },
      removeEventListener: (_: string, cb: MatchMediaListener) => {
        darkListeners = darkListeners.filter((l) => l !== cb);
      },
    })),
  });
});

afterEach(() => {
  // biome-ignore lint/suspicious/noDocumentCookie: test setup
  document.cookie = "theme=; max-age=0";
  document.documentElement.classList.remove("light", "dark");
});

describe("usePreferredTheme", () => {
  it("defaults to light when no cookie and system is light", () => {
    const { result } = renderHook(() => usePreferredTheme());
    expect(result.current.value).toBe("light");
    expect(result.current.source).toBe("system");
  });

  it("defaults to dark when system prefers dark", () => {
    darkMatches = true;
    const { result } = renderHook(() => usePreferredTheme());
    expect(result.current.value).toBe("dark");
    expect(result.current.source).toBe("system");
  });

  it("reads theme from cookie", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "theme=dark";
    const { result } = renderHook(() => usePreferredTheme());
    expect(result.current.value).toBe("dark");
    expect(result.current.source).toBe("stored");
  });

  it("ignores invalid cookie values and falls back to system", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "theme=sepia";
    darkMatches = true;

    const { result } = renderHook(() => usePreferredTheme());

    expect(result.current.value).toBe("dark");
    expect(result.current.source).toBe("system");
  });

  it("uses initialValue for SSR hydration", () => {
    const { result } = renderHook(() =>
      usePreferredTheme({ initialValue: "dark" }),
    );
    expect(result.current.value).toBe("dark");
    expect(result.current.source).toBe("system");
  });

  it("reports stored source when initialValue is provided and cookie exists", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "theme=dark";
    const { result } = renderHook(() =>
      usePreferredTheme({ initialValue: "dark" }),
    );
    expect(result.current.value).toBe("dark");
    expect(result.current.source).toBe("stored");
  });

  it("warns when cookie and rendered value disagree during hydration", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "theme=dark";

    renderHook(() => usePreferredTheme({ initialValue: "light" }));

    expect(warn).toHaveBeenCalledWith(
      'useMediaPreference: cookie "theme" says "dark" but rendered "light". Pass initialValue from the server to avoid flash-of-wrong-preference.',
    );

    warn.mockRestore();
  });

  it("applies class on documentElement", () => {
    renderHook(() => usePreferredTheme());
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("switches class when theme changes", () => {
    const { result } = renderHook(() => usePreferredTheme());

    act(() => {
      result.current.set("dark");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("writes cookie on set", () => {
    const { result } = renderHook(() => usePreferredTheme());

    act(() => {
      result.current.set("dark");
    });

    expect(result.current.value).toBe("dark");
    expect(result.current.source).toBe("stored");
    expect(document.cookie).toContain("theme=dark");
  });

  it("clears cookie and reverts to system on reset", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "theme=dark";
    const { result } = renderHook(() => usePreferredTheme());

    expect(result.current.value).toBe("dark");

    act(() => {
      result.current.reset();
    });

    expect(result.current.source).toBe("system");
    expect(result.current.value).toBe("light");
  });

  it("responds to system theme changes when following system", () => {
    const { result } = renderHook(() => usePreferredTheme());
    expect(result.current.value).toBe("light");

    act(() => {
      darkMatches = true;
      for (const listener of darkListeners) {
        listener({ matches: true });
      }
    });

    expect(result.current.value).toBe("dark");
    expect(result.current.source).toBe("system");
  });

  it("does not respond to system changes when preference is stored", () => {
    const { result } = renderHook(() => usePreferredTheme());

    act(() => {
      result.current.set("light");
    });

    act(() => {
      darkMatches = true;
      for (const listener of darkListeners) {
        listener({ matches: true });
      }
    });

    expect(result.current.value).toBe("light");
    expect(result.current.source).toBe("stored");
  });

  it("uses custom cookie name", () => {
    const { result } = renderHook(() =>
      usePreferredTheme({ cookieName: "color-scheme" }),
    );

    act(() => {
      result.current.set("dark");
    });

    expect(document.cookie).toContain("color-scheme=dark");
  });

  it("cleans up class on unmount", () => {
    const { unmount } = renderHook(() => usePreferredTheme());
    expect(document.documentElement.classList.contains("light")).toBe(true);

    unmount();
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });
});
