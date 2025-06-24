import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
// Extends vitest's matchers with jest-dom's matchers
import "@testing-library/jest-dom/vitest";

// Cleanup the DOM after each test
afterEach(() => {
  cleanup();
});
