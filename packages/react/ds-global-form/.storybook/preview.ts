import previewConfig from "@canonical/storybook-config/preview";

import "./styles.css";

const preview = {
  ...previewConfig,
  // https://github.com/storybookjs/storybook/issues/31842
  tags: ["autodocs"],
  parameters: {
    ...previewConfig.parameters,
    options: {
      ...previewConfig.parameters?.options,
      // Sidebar order by ontology tier (N.04): docs first, then the tiers, then
      // the non-tier machinery (common/utils) last.
      storySort: {
        order: [
          "Getting Started",
          "subcomponents",
          "components",
          "patterns",
          "common",
          "utils",
          "*",
        ],
      },
    },
  },
};

export default preview;
