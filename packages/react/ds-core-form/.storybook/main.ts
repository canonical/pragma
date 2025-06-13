import { createConfig } from "@canonical/storybook-config";

const config = createConfig({
	staticDirs: ["../src/assets", "../public"],
	extraAddons: ["@canonical/storybook-addon-msw"],
});

export default config;
