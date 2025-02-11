import type { StorybookConfig } from "@storybook/react-vite";

type GetAbsolutePath = (input: string) => string;

const createConfig = (getAbsolutePath: GetAbsolutePath): StorybookConfig => ({
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	addons: [
		getAbsolutePath("@storybook/addon-onboarding"),
		getAbsolutePath("@storybook/addon-links"),
		getAbsolutePath("@storybook/addon-essentials"),
		getAbsolutePath("@chromatic-com/storybook"),
		getAbsolutePath("@storybook/addon-interactions"),
		getAbsolutePath("@storybook/addon-themes"),
		// This is a bit weird, but for some reason this doesn't work when referenced via getAbsolutePath
		// see also: https://github.com/storybookjs/storybook/issues/24351#issuecomment-1777911065
		"@canonical/storybook-addon-baseline-grid",
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
	staticDirs: ["../src/assets"],
});

export default createConfig;
