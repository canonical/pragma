import previewConfig from "@canonical/storybook-config/preview";

import "../src/lib/index.css";

const preview = {
  ...previewConfig,
  // Storybook statically parses `preview.ts` for `storySort` and requires the
  // order to be an inline literal — an imported const is rejected — and it does
  // not reliably merge `tags`/`parameters` spread from an imported preview. So
  // both `tags` and the `storySort` order are declared inline here rather than
  // inherited from `@canonical/storybook-config`.
  // https://github.com/storybookjs/storybook/issues/31842
  tags: ["autodocs"],
  parameters: {
    ...previewConfig.parameters,
    options: {
      storySort: {
        order: [
          "Documentation",
          ["Introduction", "*"],
          "subcomponents",
          "components",
          "groups",
          "patterns",
          "common",
          "utils",
          "_work_in_progress",
        ],
      },
    },
  },
};

export default preview;
