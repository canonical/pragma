import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";

expect.extend(matchers as unknown as Parameters<typeof expect.extend>[0]);

// Clean up the DOM after each test
afterEach(() => {
  cleanup();
});

// React Flow observes the size of its container via ResizeObserver, which jsdom
// does not implement. A no-op mock lets components that mount a canvas render in
// unit tests without measuring a real layout.
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
