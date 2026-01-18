import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
// Extends vitest's matchers with jest-dom's matchers
import "@testing-library/jest-dom/vitest";

// Cleanup the DOM after each test
afterEach(() => {
  cleanup();
});

class ResizeObserverMock {
  observe = vitest.fn();
  unobserve = vitest.fn();
  disconnect = vitest.fn();
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
