import { previewConfig } from "@canonical/storybook-config/preview";

import "../src/styles/index.css";
import "@canonical/styles-debug/baseline-grid";

const preview = {
  ...previewConfig,
};

export default preview;
