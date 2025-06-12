import { dirname, join } from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";

function getAbsolutePath(value: string): string {
	return dirname(require.resolve(join(value, "package.json")));
}

const FRAMEWORK_DATA = {
	react: {
		storyPatterns: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
		additionalAddons: [],
		frameworkName: getAbsolutePath("@storybook/react-vite"),
	},
	sveltekit: {
		storyPatterns: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx|svelte)"],
		additionalAddons: [
			getAbsolutePath("@storybook/addon-svelte-csf"),
			// getAbsolutePath("@storybook/addon-a11y"),
		],
		frameworkName: getAbsolutePath("@storybook/sveltekit"),
	},
} as const;

type StorybookFramework = keyof typeof FRAMEWORK_DATA;
type CreateConfigOptions<T extends StorybookFramework = StorybookFramework> = {
	staticDirs?: string[];
	extraAddons?: string[];
	framework?: T;
};

const createConfig = (options: CreateConfigOptions = {}): StorybookConfig => {
	const framework = options.framework || "react";
	const frameworkOptions = FRAMEWORK_DATA[framework];

	if (!frameworkOptions) {
		throw new Error(
			`Unsupported framework: ${framework}. Supported frameworks: ${Object.keys(FRAMEWORK_DATA).join(", ")}`,
		);
	}

	const config = {
		stories: ["../src/**/*.mdx", ...frameworkOptions.storyPatterns],
		addons: [
			getAbsolutePath("@chromatic-com/storybook"),
			getAbsolutePath("@storybook/addon-docs"),
			getAbsolutePath("@storybook/addon-a11y"),
			getAbsolutePath("@storybook/addon-vitest"),
			// // This is a bit weird, but for some reason this doesn't work when referenced via getAbsolutePath
			// // see also: https://github.com/storybookjs/storybook/issues/24351#issuecomment-1777911065
			"@canonical/storybook-addon-baseline-grid",
			...(frameworkOptions.additionalAddons || []),
			...(options.extraAddons || []),
			// getAbsolutePath("@storybook/addon-links"),
			// getAbsolutePath("@storybook/addon-essentials"),
			// getAbsolutePath("@chromatic-com/storybook"),
			// getAbsolutePath("@storybook/addon-interactions"),
			// getAbsolutePath("@storybook/addon-themes"),
		],
		framework: {
			name: frameworkOptions.frameworkName,
			options: {},
		},
		core: {
			disableTelemetry: true,
		},
		typescript: {
			check: true,
		},
		staticDirs: options.staticDirs,
	};
	return config;
};

export default createConfig;
