/// <reference types="@vitest/browser/matchers" />

import "./src/lib/index.css";
import { afterEach } from "vitest";
import { cleanup } from "vitest-browser-svelte";

// The client projects share one iframe across files (isolate:false), and the
// library's own auto-cleanup does not span that boundary — a component left
// by one file trips the next file's strict locators. Unmount everything
// after each test.
afterEach(() => {
  cleanup();
});
