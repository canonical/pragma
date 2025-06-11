import { createConfig } from "@canonical/storybook-config";
import type { StorybookConfig } from "@storybook/react-vite";

const config = createConfig({
	staticDirs: ["../src/assets", "../public"],
});

export default config;
