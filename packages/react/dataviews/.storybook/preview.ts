import previewConfig from "@canonical/storybook-config/preview";
import type { Preview } from "@storybook/react-vite";

import "./styles.css";

const preview: Preview = {
  ...previewConfig,
  // https://github.com/storybookjs/storybook/issues/31842
  tags: ["autodocs"],
};

export default preview;
