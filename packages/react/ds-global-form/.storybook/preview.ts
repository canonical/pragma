import previewConfig from "@canonical/storybook-config/preview";

import "./styles.css";

const preview = {
  ...previewConfig,
  // https://github.com/storybookjs/storybook/issues/31842
  tags: ["autodocs"],
  globalTypes: {
    grid: {
      description: "Grid layout strategy",
      toolbar: {
        icon: "grid",
        items: ["intrinsic", "responsive"],
        title: "Grid",
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    grid: "intrinsic",
  },
};

export default preview;
