import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";

expect.extend(matchers as unknown as Parameters<typeof expect.extend>[0]);

// relay-test-utils' `createMockEnvironment` wraps environment methods in
// `jest.fn` mocks whenever NODE_ENV === "test", reaching for a global `jest`
// object. Vitest sets NODE_ENV=test but exposes `vi` instead, so alias it —
// `vi.fn` is API-compatible with the `jest.fn` surface relay-test-utils uses
// (`.mock`, `.mockClear`).
(globalThis as { jest?: typeof vi }).jest = vi;

afterEach(() => {
  cleanup();
});
