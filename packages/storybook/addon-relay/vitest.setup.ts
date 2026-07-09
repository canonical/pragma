import { afterAll, vi } from "vitest";

// relay-test-utils' `createMockEnvironment` wraps environment methods in
// `jest.fn` mocks whenever NODE_ENV === "test", reaching for a global `jest`
// object. Vitest sets NODE_ENV=test but exposes `vi` instead, so alias it —
// `vi.fn` is API-compatible with the `jest.fn` surface relay-test-utils uses
// (`.mock`, `.mockClear`). Inside Storybook itself NODE_ENV is development or
// production, so this code path never runs at addon runtime.
// Only fill the global when absent, and restore it afterwards, so a real Jest
// global (or another suite's shim) is never masked or leaked past this suite.
const globalWithJest = globalThis as { jest?: typeof vi };
const previousJest = globalWithJest.jest;

if (previousJest === undefined) {
  globalWithJest.jest = vi;
}

afterAll(() => {
  globalWithJest.jest = previousJest;
});
