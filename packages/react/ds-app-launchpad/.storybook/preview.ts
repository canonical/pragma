import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview, ReactRenderer } from "@storybook/react";

import "index.css";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on.*" },
  },
  decorators: [
    withThemeByClassName<ReactRenderer>({
      themes: {
        light: "is-light",
        dark: "is-dark",
        paper: "is-paper",
      },
      defaultTheme: "light",
    }),
  ],
};

export default preview;
