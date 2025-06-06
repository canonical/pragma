import { dirname, join } from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";

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
      // This Storybook addon allows you to write Storybook stories using the Svelte language instead of ESM that regular CSF is based on.
      getAbsolutePath("@storybook/addon-svelte-csf"),
    ],
    frameworkName: getAbsolutePath("@storybook/sveltekit"),
  },
} as const;

const BASE_ADDONS = [
  getAbsolutePath("@chromatic-com/storybook"),
  // provides accessibility testing for Storybook stories. It uses axe-core to run the tests.
  getAbsolutePath("@storybook/addon-a11y"),
  getAbsolutePath("@storybook/addon-essentials"),
  getAbsolutePath("@storybook/addon-interactions"),
  getAbsolutePath("@storybook/addon-links"),
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
      `Unsupported framework: ${framework}. Supported frameworks: ${Object.keys(FRAMEWORK_CONFIGS).join(", ")}`,
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
