import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Resolves a Canonical addon to its `/manager` entry, as
 * `@canonical/storybook-config` and `apps/react/storybook-hub` both do.
 */
function getAddonPath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/manager`)));
}

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  // This Storybook hand-rolls its config so it can self-host the addon it
  // develops, so it does not receive `@canonical/storybook-config`'s defaults.
  // The chrome theme is registered directly instead. Unlike its siblings it
  // genuinely cannot take the shared preview config — `storybook-config`
  // depends on THIS package, so depending back on it would be a cycle, which Nx
  // rejects. The documentation pages here therefore keep Storybook's stock
  // chrome; see canonical/pragma#962.
  addons: [
    "./local-preset.cjs",
    getAddonPath("@canonical/storybook-addon-shell-theme"),
  ],
  framework: "@storybook/react-vite",
  core: { disableTelemetry: true },
};

export default config;
