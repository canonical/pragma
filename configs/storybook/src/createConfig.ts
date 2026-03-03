import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "storybook/internal/types";

function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

function getAddonPath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/manager`)));
}

type StorybookFrameworkConfig = {
  framework: string;
  addons: StorybookConfig["addons"];
};

const frameworks = {
  react: {
    framework: getAbsolutePath("@storybook/react-vite"),
    addons: [],
  },
  svelte: {
    framework: getAbsolutePath("@storybook/svelte-vite"),
    addons: [getAbsolutePath("@storybook/addon-svelte-csf")],
  },
  webcomponents: {
    framework: getAbsolutePath("@storybook/web-components-vite"),
    addons: [],
  },
} as const satisfies Record<string, StorybookFrameworkConfig>;

type CreateConfigOptions = {
  staticDirs?: string[];
  extraAddons?: string[];
  disabledAddons?: string[];
  projectName?: string;
  projectLogo?: string;
};

function createConfig<T extends keyof typeof frameworks>(
  framework: T,
  options?: CreateConfigOptions,
): StorybookConfig {
  const opts = options ?? {};
  return {
    stories: [
      "../src/**/*.mdx",
      "../src/**/*.stories.@(js|jsx|mjs|ts|tsx|svelte)",
    ],
    addons: [
      getAbsolutePath("@chromatic-com/storybook"),
      getAbsolutePath("@storybook/addon-docs"),
      getAbsolutePath("@storybook/addon-a11y"),
      getAbsolutePath("@storybook/addon-vitest"),
      getAbsolutePath("@storybook/addon-themes"),
      getAddonPath("@canonical/storybook-addon-baseline-grid"),
      getAddonPath("@canonical/storybook-addon-shell-theme"),
      ...frameworks[framework].addons,
      ...(opts.extraAddons ?? []),
    ].filter((addon) => !opts.disabledAddons?.includes(addon)),
    framework: {
      name: frameworks[framework].framework,
      options: {},
    },
    core: {
      disableTelemetry: true,
    },
    typescript: {
      check: true,
    },
    staticDirs: [
      ...(opts.staticDirs ?? []),
      getAbsolutePath("@canonical/ds-assets"),
    ],
    env: {
      PROJECT_NAME: opts.projectName ?? "",
      PROJECT_LOGO: opts.projectLogo ?? "",
    },
  };
}

export default createConfig;
