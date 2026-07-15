import previewConfig from "@canonical/storybook-config/preview";

import "./styles.css";

const preview = {
  ...previewConfig,
  // Grid is handled entirely by @canonical/storybook-addon-utils: a story sets
  // `parameters.grid` to a GridMode ("intrinsic" | "responsive" | "none") and
  // the addon toggles the matching `.grid` classes on the story root (and the
  // toolbar can override it). No local grid decorator.
  decorators: [...[previewConfig.decorators ?? []].flat()],
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
        // Alphabetical WITHIN each group, while the `order` array below still
        // pins the top-level tier order. Without a method, items in a group that
        // aren't listed (every component under `components`) keep their file-
        // discovery order — which floated Tooltip to the top of the sidebar.
        method: "alphabetical",
        order: [
          // Keep Introduction first inside the Documentation folder.
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
