import type { Preview } from "@storybook/react-vite";

/**
 * Shared preview configuration for Pragma design system Storybooks.
 * Provides consistent story sorting with Introduction always first.
 */
export const previewConfig: Partial<Preview> = {
  parameters: {
    options: {
      storySort: {
        order: ["Introduction", "*"],
      },
    },
  },
};

export default previewConfig;
