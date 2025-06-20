import type { Preview } from "@storybook/react-vite";

import "@canonical/styles";
import "@canonical/styles-debug/baseline-grid";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  initialGlobals: {
    background: { value: "light" },
  }
};

export default preview;
