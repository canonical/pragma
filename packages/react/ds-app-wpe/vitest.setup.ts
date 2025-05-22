import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
// Extends vitest's matchers with jest-dom's matchers
import "@testing-library/jest-dom/vitest";

// Cleanup the DOM after each test
afterEach(() => {
  cleanup();
});

global.ResizeObserver = vitest.fn().mockImplementation(() => ({
  observe: vitest.fn(),
  unobserve: vitest.fn(),
  disconnect: vitest.fn(),
}));
