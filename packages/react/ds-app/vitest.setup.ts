import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vitest } from "vitest";

expect.extend(matchers as unknown as Parameters<typeof expect.extend>[0]);

afterEach(() => {
  cleanup();
});

// A class, not `vitest.fn().mockImplementation(arrowFn)`: consumers call
// `new ResizeObserver(callback)`, and an arrow function is not a constructor.
class ResizeObserverMock {
  observe = vitest.fn();
  unobserve = vitest.fn();
  disconnect = vitest.fn();
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// jsdom ships no matchMedia. Defaults to `matches: false` (the "wide
// viewport" answer); a test that needs the small-viewport branch mocks the
// return value on top of this (vi.spyOn(window, "matchMedia")).
class MediaQueryListMock {
  matches = false;
  media: string;
  onchange:
    | ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown)
    | null = null;
  addEventListener = vitest.fn();
  removeEventListener = vitest.fn();
  addListener = vitest.fn();
  removeListener = vitest.fn();
  dispatchEvent = vitest.fn();
  constructor(media: string) {
    this.media = media;
  }
}

global.matchMedia = ((media: string) =>
  new MediaQueryListMock(media)) as unknown as typeof matchMedia;
