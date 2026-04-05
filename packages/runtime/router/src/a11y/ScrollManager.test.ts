import { describe, expect, it, vi } from "vitest";
import ScrollManager from "./ScrollManager.js";

function createWindow() {
  return {
    pageXOffset: 0 as number | undefined,
    pageYOffset: 0 as number | undefined,
    scrollTo: vi.fn<(position: { left: number; top: number }) => void>(),
    scrollX: 0 as number | undefined,
    scrollY: 0 as number | undefined,
  };
}

function createSessionStorage() {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("ScrollManager", () => {
  it("saves the current scroll position", () => {
    const windowLike = createWindow();
    const sessionStorage = createSessionStorage();
    const manager = new ScrollManager(windowLike, { sessionStorage });

    windowLike.scrollX = 12;
    windowLike.scrollY = 24;
    manager.save(new URL("https://example.com/docs"));

    expect(
      sessionStorage.getItem("@canonical/router-core:scroll-positions"),
    ).toBe(
      JSON.stringify({
        "https://example.com/docs": { x: 12, y: 24 },
      }),
    );
  });

  it("restores saved positions on pop navigation", () => {
    const windowLike = createWindow();
    const sessionStorage = createSessionStorage();
    const manager = new ScrollManager(windowLike, { sessionStorage });

    sessionStorage.setItem(
      "@canonical/router-core:scroll-positions",
      JSON.stringify({
        "https://example.com/docs": { x: 40, y: 80 },
      }),
    );
    manager.restore("https://example.com/docs", "pop");

    expect(windowLike.scrollTo).toHaveBeenCalledWith({ left: 40, top: 80 });
  });

  it("scrolls hash targets into view on push navigation", () => {
    const windowLike = createWindow();
    const target = {
      scrollIntoView: vi.fn<() => void>(),
    };
    const manager = new ScrollManager(windowLike, {
      document: {
        getElementById(id: string) {
          return id === "details" ? target : null;
        },
      },
    });

    manager.restore("/docs#details", "push");

    expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(windowLike.scrollTo).not.toHaveBeenCalled();
  });

  it("falls back to the top when no saved or hash position exists", () => {
    const windowLike = createWindow();
    const sessionStorage = {
      getItem() {
        return "not-json";
      },
      setItem: vi.fn<(key: string, value: string) => void>(),
    };
    const manager = new ScrollManager(windowLike, {
      document: {
        getElementById() {
          return null;
        },
      },
      sessionStorage,
    });

    manager.restore("/docs#missing", "push");

    expect(windowLike.scrollTo).toHaveBeenCalledWith({ left: 0, top: 0 });
  });

  it("scrolls to the top for push navigations without a hash", () => {
    const windowLike = createWindow();
    const manager = new ScrollManager(windowLike);

    manager.restore("/docs", "push");

    expect(windowLike.scrollTo).toHaveBeenCalledWith({ left: 0, top: 0 });
  });

  it("uses page offsets when scrollX and scrollY are unavailable", () => {
    const windowLike = createWindow();
    const sessionStorage = createSessionStorage();
    const manager = new ScrollManager(windowLike, { sessionStorage });

    windowLike.scrollX = undefined;
    windowLike.scrollY = undefined;
    windowLike.pageXOffset = 5;
    windowLike.pageYOffset = 15;
    manager.save("/docs");

    expect(
      sessionStorage.getItem("@canonical/router-core:scroll-positions"),
    ).toBe(
      JSON.stringify({
        "https://router.local/docs": { x: 5, y: 15 },
      }),
    );
  });
});
