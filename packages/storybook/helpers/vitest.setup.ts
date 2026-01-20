import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";

expect.extend(matchers as Parameters<typeof expect.extend>[0]);

afterEach(() => {
  cleanup();
});
