import previewConfig from "@canonical/storybook-config/preview";
import type { Preview } from "@storybook/web-components-vite";

import "./styles.css";

const preview: Preview = {
  ...previewConfig,
};

export default preview;
