import { vi } from "vitest";

// relay-test-utils' `createMockEnvironment` wraps environment methods in
// `jest.fn` mocks whenever NODE_ENV === "test", reaching for a global `jest`
// object. Vitest sets NODE_ENV=test but exposes `vi` instead, so alias it —
// `vi.fn` is API-compatible with the `jest.fn` surface relay-test-utils uses
// (`.mock`, `.mockClear`). Inside Storybook itself NODE_ENV is development or
// production, so this code path never runs at addon runtime.
(globalThis as { jest?: typeof vi }).jest = vi;
