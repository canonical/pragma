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
      // Sidebar order by ontology tier (N.04): the Documentation folder first
      // (Introduction, then Getting Started, then Guides), then the tiers, then
      // the non-tier machinery (common/utils) last.
      storySort: {
        order: [
          "Documentation",
          ["Introduction", "Getting Started", "Guides"],
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
