import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/svelte";
import { afterEach, expect } from "vitest";

expect.extend(matchers as unknown as Parameters<typeof expect.extend>[0]);

// Cleanup the DOM after each test
afterEach(() => {
  cleanup();
});
