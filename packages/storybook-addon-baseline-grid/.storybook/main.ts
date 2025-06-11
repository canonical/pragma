import { createConfig } from "@canonical/storybook-config";

const config = createConfig({
	staticDirs: [],
	extraAddons: ["./local-preset.js"],
});

export default { ...config };
