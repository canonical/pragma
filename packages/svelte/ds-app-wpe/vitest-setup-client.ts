/// <reference types="@vitest/browser/matchers" />

import "./src/lib/index.css";
import { afterEach } from "vitest";
import { cleanup } from "vitest-browser-svelte";

// The shared iframe needs an explicit unmount between tests: the library's
// auto-cleanup does not span the file boundary.
afterEach(() => {
  cleanup();
});
