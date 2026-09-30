import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

// jest-dom 7.0.1 augments the single-generic vitest 4 `Assertion<T>`; vitest 5
// declares `Assertion<R, T>`, so that merge fails and every matcher disappears.
// Restore them against the current shape until jest-dom ships vitest 5 support.
declare module "vitest" {
  interface Assertion<R extends void | Promise<void> = void, T = unknown>
    extends TestingLibraryMatchers<any, T> {}
}
