import previewConfig from "@canonical/storybook-config/preview";
import type { Preview } from "@storybook/react-vite";

import "@canonical/styles";
import "@canonical/styles-debug/baseline-grid";

const preview: Preview = {
  ...previewConfig,
  parameters: {
    ...previewConfig.parameters,
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
