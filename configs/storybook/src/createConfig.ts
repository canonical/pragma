// import type { StorybookConfig } from "@storybook/react-vite";

import { dirname, join } from "node:path";

function getAbsolutePath(value: string): string {
	return dirname(require.resolve(join(value, "package.json")));
}

type CreateConfigOptions = {
	staticDirs?: string[];
};

const createConfig = (options: CreateConfigOptions = {}): StorybookConfig => ({
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	addons: [
		getAbsolutePath("@chromatic-com/storybook"),
		getAbsolutePath("@storybook/addon-docs"),
		getAbsolutePath("@storybook/addon-a11y"),
		getAbsolutePath("@storybook/addon-vitest"),
		// getAbsolutePath("@storybook/addon-links"),
		// getAbsolutePath("@storybook/addon-essentials"),
		// getAbsolutePath("@chromatic-com/storybook"),
		// getAbsolutePath("@storybook/addon-interactions"),
		// getAbsolutePath("@storybook/addon-themes"),
		// // This is a bit weird, but for some reason this doesn't work when referenced via getAbsolutePath
		// // see also: https://github.com/storybookjs/storybook/issues/24351#issuecomment-1777911065
		// "@canonical/storybook-addon-baseline-grid",
	],
	framework: {
		name: getAbsolutePath("@storybook/react-vite"),
		options: {},
	},
	core: {
		disableTelemetry: true,
	},
	typescript: {
		check: true,
	},
	staticDirs: options.staticDirs,
	docs: {
		autodocs: true,
	},
});

export default createConfig;
