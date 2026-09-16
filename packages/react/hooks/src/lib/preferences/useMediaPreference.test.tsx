import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PreferenceQuery } from "./types.js";
import useMediaPreference from "./useMediaPreference.js";

/*
  The engine's own contract, where no wrapper reaches it. The three
  media-backed wrappers cover the query-driven paths between them; these pin
  the two degenerate configurations `usePreferredShortcuts` relies on and
  nothing else asserts — a preference with NO media queries, and one whose
  every value maps to no class. Both hold by construction today, the query
  loops iterating nothing and `null` already being the engine's "apply no
  class" encoding, which is exactly why they want pinning: they are a
  contract the engine owes now, not an accident of its loops. If `queries`
  or `classMap` are ever made optional, this is the file that moves with them.
*/

type Switch = "on" | "off";

const NO_QUERIES: PreferenceQuery<Switch>[] = [];
const NO_CLASSES = { on: null, off: null };
const ALL_VALUES = ["on", "off"] as const;

let matchMedia: ReturnType<typeof vi.fn>;

const renderSwitch = (initialValue?: Switch) =>
  renderHook(() =>
    useMediaPreference<Switch>({
      queries: NO_QUERIES,
      defaultValue: "on",
      allValues: ALL_VALUES,
      classMap: NO_CLASSES,
      cookieName: "engine-switch",
      initialValue,
    }),
  );

beforeEach(() => {
  // Deliberately matches EVERY query, so a hook that still probed matchMedia
  // would be visible both as a call and as a wrong resolved value.
  matchMedia = vi.fn((query: string) => ({
    matches: true,
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
  document.cookie = "engine-switch=; path=/; max-age=0";
  document.documentElement.className = "";
});

describe("useMediaPreference", () => {
  describe("with no queries", () => {
    it("resolves the stored cookie, else the fallback", () => {
      const { result: fallback } = renderSwitch();
      expect(fallback.current.value).toBe("on");
      expect(fallback.current.source).toBe("system");

      // biome-ignore lint/suspicious/noDocumentCookie: test setup
      document.cookie = "engine-switch=off; path=/";
      const { result: stored } = renderSwitch();
      expect(stored.current.value).toBe("off");
      expect(stored.current.source).toBe("stored");
    });

    it("lets an SSR initialValue win over the fallback", () => {
      const { result } = renderSwitch("off");
      expect(result.current.value).toBe("off");
      expect(result.current.source).toBe("system");
    });

    it("subscribes to nothing", () => {
      renderSwitch();
      expect(matchMedia).not.toHaveBeenCalled();
    });

    it("resets to defaultValue, there being no system value to return to", () => {
      const { result } = renderSwitch();
      act(() => {
        result.current.set("off");
      });
      expect(result.current.value).toBe("off");
      act(() => {
        result.current.reset();
      });
      expect(result.current.value).toBe("on");
      expect(result.current.source).toBe("system");
    });
  });

  describe("with an all-null classMap", () => {
    // Seeded with an unrelated class on purpose. Asserting merely that the
    // preference's own class is absent would also pass a cleanup that wiped
    // documentElement wholesale; this catches that, and the three sibling
    // hooks' tests cannot.
    it("touches no classes on documentElement", () => {
      document.documentElement.className = "pre-existing";
      const { result } = renderSwitch();
      expect(document.documentElement.className).toBe("pre-existing");
      act(() => {
        result.current.set("off");
      });
      expect(document.documentElement.className).toBe("pre-existing");
    });

    it("leaves documentElement untouched on unmount", () => {
      document.documentElement.className = "pre-existing";
      const { unmount } = renderSwitch();
      unmount();
      expect(document.documentElement.className).toBe("pre-existing");
    });
  });
});
