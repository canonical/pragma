import "./src/lib/index.css";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/svelte";
import { afterEach, expect } from "vitest";

expect.extend(matchers as unknown as Parameters<typeof expect.extend>[0]);

afterEach(() => {
  cleanup();
});
