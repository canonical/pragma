import { THEME } from "@canonical/storybook-addon-shell-theme";
import type { Preview } from "@storybook/react-vite";

import "@canonical/styles";
import "@canonical/styles-debug/baseline-grid";

// This Storybook cannot use `@canonical/storybook-config`'s docs container —
// storybook-config depends on this package, and Nx rejects a circular project
// graph — so it themes its own documentation pages here.
//
// Without this, removing `forceLightDocs` reintroduces canonical/pragma#962
// exactly here: story content follows the OS, while the docs page around it
// stays on Storybook's stock light theme, so a dark OS renders dark-scheme
// content on light chrome.
//
// Resolved once at module load rather than subscribed to, because
// `parameters.docs.theme` is read at render: a live OS change needs a reload
// here, unlike the container in storybook-config. That is an acceptable
// limitation for an addon's own development harness.
const prefersDark =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const preview: Preview = {
  parameters: {
    docs: {
      codePanel: true,
      theme: prefersDark ? THEME.dark : THEME.light,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  initialGlobals: {
    background: { value: "light" },
  },
};

export default preview;
