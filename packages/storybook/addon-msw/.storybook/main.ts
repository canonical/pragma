import { createConfig } from "@canonical/storybook-config";

const config = createConfig({
  // TODO - The static dir public should be required - but it seems `mockServiceWorker.js` is served nonetheless. Unsure where it comes from.
  staticDirs: ["../public"],
  extraAddons: ["./local-preset.js"],
});

export default { ...config };
