import { createConfig } from "@canonical/storybook-config";

export default createConfig("react", {
  staticDirs: ["../src/assets"],
  extraAddons: ["@canonical/storybook-addon-msw"],
});
