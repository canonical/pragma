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
      defaultValue: "fluid",
      toolbar: {
        icon: "grid",
        items: ["fluid", "fixed"],
        title: "Grid",
      },
    },
  },
};

export default preview;
