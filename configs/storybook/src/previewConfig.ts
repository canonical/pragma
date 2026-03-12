import { withThemeByClassName } from "@storybook/addon-themes";
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
 * Theme decorator for Pragma design system Storybooks.
 * Provides light, dark, and paper theme switching.
 */
export const themeDecorator = withThemeByClassName({
  themes: {
    light: "is-light",
    dark: "dark",
    paper: "is-paper",
  },
  defaultTheme: "light",
});

/**
 * Shared preview configuration for Pragma design system Storybooks.
 * Provides consistent story sorting with Introduction always first,
 * theme switching, and autodocs.
 */
export const previewConfig: Partial<Preview> = {
  tags: ["autodocs"],
  decorators: [themeDecorator],
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
