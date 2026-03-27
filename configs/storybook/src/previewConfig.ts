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
 * Provides consistent story sorting with Introduction always first and autodocs.
 *
 * Color scheme toggling is handled by @canonical/storybook-addon-utils
 * which provides .light/.dark class toggling via its toolbar control.
 */
export const previewConfig: Partial<Preview> = {
  tags: ["autodocs"],
  parameters: {
    options: {
      storySort: {
        order: ["Introduction", "Stable", "Beta", "Experimental", "*"],
      },
    },
    docs: {
      codePanel: true,
    },
  },
};

export default previewConfig;
