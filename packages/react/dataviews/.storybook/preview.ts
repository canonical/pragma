import previewConfig from "@canonical/storybook-config/preview";
import type { Preview } from "@storybook/react-vite";

import "./styles.css";

const preview: Preview = {
  ...previewConfig,
  parameters: {
    ...previewConfig.parameters,
    // Every story is checked by the accessibility addon, and a violation
    // fails its test rather than only showing in the panel.
    a11y: { test: "error" },
  },
  // https://github.com/storybookjs/storybook/issues/31842
  tags: ["autodocs"],
};

export default preview;
