import previewConfig from "@canonical/storybook-config/preview";

import "./styles.css";

const preview = {
  ...previewConfig,
  // https://github.com/storybookjs/storybook/issues/31842
  tags: ["autodocs"],
  // The sidebar story order (by ontology tier) is inherited from
  // `@canonical/storybook-config`; no local override needed.
};

export default preview;
