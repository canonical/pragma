import previewConfig from "@canonical/storybook-config/preview";

import "./styles.css";

const preview = {
  ...previewConfig,
  // https://github.com/storybookjs/storybook/issues/31842
  tags: ["autodocs"],
  globalTypes: {
    ...previewConfig.globalTypes,
    grid: {
      name: "Grid",
      description: "Grid layout strategy",
      defaultValue: "intrinsic",
      toolbar: {
        icon: "grid",
        items: ["intrinsic", "responsive"],
        title: "Grid",
      },
    },
  },
};

export default preview;
