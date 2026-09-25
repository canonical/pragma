/// <reference types="@vitest/browser/matchers" />

import { afterEach } from "vitest";
import { cleanup } from "vitest-browser-svelte";

// The shared iframe needs an explicit unmount between tests: the library's
// auto-cleanup does not span the file boundary.
afterEach(() => {
  cleanup();
});

// Place any code that must be run to configure clientside (Playwright)
// tests here.
