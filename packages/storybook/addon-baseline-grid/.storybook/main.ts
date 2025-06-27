import { createConfig } from "@canonical/storybook-config";

const config = createConfig({
  staticDirs: [],
  extraAddons: ["./local-preset.js"],
  disabledAddons: ["@canonical/storybook-addon-baseline-grid"],
});

export default { ...config };
