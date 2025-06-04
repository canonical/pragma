import type { StorybookConfig } from "@storybook/react-vite";
import { dirname, join } from "node:path";

function getAbsolutePath(value: string): string {
  return dirname(require.resolve(join(value, "package.json")));
}

const FRAMEWORK_CONFIGS = {
  react: {
    storyPatterns: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
    additionalAddons: [],
    frameworkName: getAbsolutePath("@storybook/react-vite"),
  },
  svelte: {
    storyPatterns: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx|svelte)"],
    additionalAddons: [
      getAbsolutePath("@storybook/addon-svelte-csf"),
      getAbsolutePath("@storybook/addon-a11y"),
    ],
    frameworkName: getAbsolutePath("@storybook/sveltekit"),
  },
} as const;

const BASE_ADDONS = [
  getAbsolutePath("@storybook/addon-links"),
  getAbsolutePath("@storybook/addon-essentials"),
  getAbsolutePath("@chromatic-com/storybook"),
  getAbsolutePath("@storybook/addon-interactions"),
  getAbsolutePath("@storybook/addon-themes"),
  // This is a bit weird, but for some reason this doesn't work when referenced via getAbsolutePath
  // see also: https://github.com/storybookjs/storybook/issues/24351#issuecomment-1777911065
  "@canonical/storybook-addon-baseline-grid",
];

type StorybookFramework = keyof typeof FRAMEWORK_CONFIGS;
type CreateConfigOptions<T extends StorybookFramework = StorybookFramework> = {
  staticDirs?: string[];
  framework?: T;
};

function createConfig(options: CreateConfigOptions = {}): StorybookConfig {
  const framework = options.framework || "react";
  const frameworkConfig = FRAMEWORK_CONFIGS[framework];

  if (!frameworkConfig) {
    throw new Error(
      `Unsupported framework: ${framework}. Supported frameworks: ${Object.keys(FRAMEWORK_CONFIGS).join(", ")}`
    );
  }

  return {
    stories: ["../src/**/*.mdx", ...frameworkConfig.storyPatterns],
    addons: [...BASE_ADDONS, ...frameworkConfig.additionalAddons],
    framework: {
      name: frameworkConfig.frameworkName,
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
  };
}

export default createConfig;
