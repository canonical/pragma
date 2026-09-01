import { createConfig } from "@canonical/storybook-config";

/**
 * `extraAddons` carries the local preset so this Storybook self-hosts the addon
 * it develops, rather than the published copy.
 */
export default createConfig("react", {
  extraAddons: ["./local-preset.js"],
  staticDirs: ["../public"],
});
