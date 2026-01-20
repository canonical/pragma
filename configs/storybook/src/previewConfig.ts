import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview, ReactRenderer } from "@storybook/react-vite";

/**
 * Theme decorator for Pragma design system Storybooks.
 * Provides light, dark, and paper theme switching.
 */
export const themeDecorator = withThemeByClassName<ReactRenderer>({
  themes: {
    light: "is-light",
    dark: "is-dark",
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
        order: ["Introduction", "*"],
      },
    },
    docs: {
      codePanel: true,
    },
  },
};

export default previewConfig;
