import "@testing-library/jest-dom/vitest";

/**
 * jsdom has no ResizeObserver, and the design system's ContextualMenu fits
 * itself to the window through one as it mounts, so a table whose header
 * menu opens would throw as the menu mounts. A browser API the environment
 * lacks is stood in for here, as the design system's own tests do: an
 * observer that observes nothing and never reports. Tests that measure stub
 * their own.
 */
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}
