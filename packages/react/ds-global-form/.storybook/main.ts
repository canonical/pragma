import { createConfig } from "@canonical/storybook-config";

export default createConfig({
  staticDirs: ["../src/assets"],
  extraAddons: ["@canonical/storybook-addon-msw"],
});
