import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview, ReactRenderer } from "@storybook/react-vite";

import "index.css";

const preview: Preview = {
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
