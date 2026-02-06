import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";

expect.extend(matchers as unknown as Parameters<typeof expect.extend>[0]);

afterEach(() => {
  cleanup();
});

global.ResizeObserver = vitest.fn().mockImplementation(() => ({
  observe: vitest.fn(),
  unobserve: vitest.fn(),
  disconnect: vitest.fn(),
}));
