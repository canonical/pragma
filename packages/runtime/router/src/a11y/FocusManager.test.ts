import { describe, expect, it, vi } from "vitest";
import FocusManager from "./FocusManager.js";

function createFocusableElement(initialTabIndex: string | null = null) {
  const attributes = new Map<string, string>();
  const focus = vi.fn<(options?: { preventScroll?: boolean }) => void>();
  const setAttribute = vi.fn<(name: string, value: string) => void>(
    (name, value) => {
      attributes.set(name, value);
    },
  );

  if (initialTabIndex !== null) {
    attributes.set("tabindex", initialTabIndex);
  }

  return {
    focus,
    getAttribute(name: string) {
      return attributes.get(name) ?? null;
    },
    setAttribute,
  };
}

describe("FocusManager", () => {
  it("focuses the first heading and sets tabindex", () => {
    const heading = createFocusableElement();
    const fallback = createFocusableElement();
    const manager = new FocusManager({
      querySelector(selector) {
        return selector === "h1" ? heading : fallback;
      },
    });

    expect(manager.focus()).toBe(true);
    expect(heading.setAttribute).toHaveBeenCalledWith("tabindex", "-1");
    expect(heading.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(fallback.focus).not.toHaveBeenCalled();
  });

  it("falls back to the outlet wrapper when no heading exists", () => {
    const fallback = createFocusableElement();
    const manager = new FocusManager(
      {
        querySelector(selector) {
          return selector === "[data-router-outlet]" ? fallback : null;
        },
      },
      { fallbackSelector: "[data-router-outlet]" },
    );

    expect(manager.focus()).toBe(true);
    expect(fallback.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("does not overwrite an existing tabindex of -1", () => {
    const heading = createFocusableElement("-1");
    const manager = new FocusManager({
      querySelector() {
        return heading;
      },
    });

    expect(manager.focus()).toBe(true);
    expect(heading.setAttribute).not.toHaveBeenCalled();
  });

  it("returns false when no focus target exists", () => {
    const manager = new FocusManager({
      querySelector() {
        return null;
      },
    });

    expect(manager.focus()).toBe(false);
  });
});
