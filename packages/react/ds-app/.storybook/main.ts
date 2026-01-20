import { createConfig } from "@canonical/storybook-config";

export default createConfig({
	staticDirs: ["../src/assets", "../public"],
	extraAddons: ["@storybook/addon-themes"],
});
