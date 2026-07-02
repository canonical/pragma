import type { Preview as ReactPreview } from "@storybook/react-vite";
import type { Preview as SveltePreview } from "@storybook/svelte-vite";
import type { Preview as LitPreview } from "@storybook/web-components-vite";

/**
 * Preview type for React, Svelte, and Lit Storybooks.
 * Most of the properties are the same, this is a convenience type to avoid
 * having to write the same type for all frameworks.
 */
type Preview = ReactPreview & SveltePreview & LitPreview;

/**
 * Shared preview configuration for Pragma design system Storybooks.
 * Provides consistent story sorting by ontology tier and autodocs.
 *
 * Sidebar order: the `Documentation` folder first, then the ontology tiers
 * (`subcomponents` → `components` → `groups` → `patterns`), then the non-tier
 * machinery (`common`, `utils`), and finally a `_work_in_progress` folder for
 * stories not yet ready for their tier. Only top-level folders are listed;
 * every story is expected to be foldered, so no wildcard catch-all is needed.
 *
 * Color scheme toggling is handled by @canonical/storybook-addon-utils
 * which provides .light/.dark class toggling via its toolbar control.
 */
export const previewConfig: Partial<Preview> = {
  tags: ["autodocs"],
  parameters: {
    options: {
      storySort: {
        order: [
          "Documentation",
          "subcomponents",
          "components",
          "groups",
          "patterns",
          "common",
          "utils",
          "_work_in_progress",
        ],
      },
    },
    docs: {
      codePanel: true,
    },
  },
};

export default previewConfig;
