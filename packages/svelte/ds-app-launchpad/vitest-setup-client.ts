/// <reference types="@vitest/browser/matchers" />

import "@canonical/launchpad-design-tokens/dist/css/dimension/responsive.css";
import "@canonical/launchpad-design-tokens/dist/css/typography/responsive.css";
import "@canonical/launchpad-design-tokens/dist/css/opacity/opacity.css";
import "@canonical/launchpad-design-tokens/dist/css/transition/preferred.css";
import "@canonical/launchpad-design-tokens/dist/css/color/light.css";
import "./src/lib/index.css";
import { afterEach } from "vitest";
import { cleanup } from "vitest-browser-svelte";

// The shared iframe needs an explicit unmount between tests: the library's
// auto-cleanup does not span the file boundary.
afterEach(() => {
  cleanup();
});
