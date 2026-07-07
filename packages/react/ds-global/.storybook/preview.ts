import previewConfig from "@canonical/storybook-config/preview";

import { withGrid } from "../src/storybook/decorators.js";
import "./styles.css";

const preview = {
  ...previewConfig,
  // Global decorators. `withGrid` wraps a story in the responsive 12-column
  // `.grid` when it sets `parameters.grid: true` (a no-op otherwise). Appended
  // to any decorators from `previewConfig` (which may be a single decorator or
  // an array) so they are not dropped.
  decorators: [...[previewConfig.decorators ?? []].flat(), withGrid],
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
