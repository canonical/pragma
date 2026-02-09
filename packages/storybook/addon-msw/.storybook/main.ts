import { createConfig } from "@canonical/storybook-config";

export default createConfig("react", {
  // TODO - The static dir public should be required - but it seems `mockServiceWorker.js` is served nonetheless. Unsure where it comes from.
  staticDirs: ["../public"],
  extraAddons: ["./local-preset.js"],
});
