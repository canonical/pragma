import { createConfig } from "@canonical/storybook-config";

const config = createConfig({
  staticDirs: ["../src/assets", "../public"],
});

export default config;
