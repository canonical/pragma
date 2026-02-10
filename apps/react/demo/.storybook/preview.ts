import previewConfig from "@canonical/storybook-config/preview";
import type { Preview } from "@storybook/react-vite";

import "index.css";

const preview: Preview = {
  ...previewConfig,
};

export default preview;
