/// <reference types="@vitest/browser/matchers" />

import "@canonical/launchpad-design-tokens/dist/css/dimension/responsive.css";
import "@canonical/launchpad-design-tokens/dist/css/typography/responsive.css";
import "@canonical/launchpad-design-tokens/dist/css/opacity/opacity.css";
import "@canonical/launchpad-design-tokens/dist/css/transition/preferred.css";
import "@canonical/launchpad-design-tokens/dist/css/color/light.css";
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
