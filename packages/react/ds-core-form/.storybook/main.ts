import { createConfig } from "@canonical/storybook-config";

export default createConfig({
  staticDirs: ["../src/assets", "../public"],
  extraAddons: ["@canonical/storybook-addon-msw"],
});
