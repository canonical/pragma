import { createConfig } from "@canonical/storybook-config";

const config = createConfig("react", {
  staticDirs: [],
  extraAddons: ["./local-preset.js"],
  disabledAddons: ["@canonical/storybook-addon-baseline-grid"],
});

export default { ...config };
