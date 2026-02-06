import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "storybook/internal/types";

function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(value + "/package.json")));
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
    addons: [
      {
        name: getAbsolutePath("@storybook/addon-svelte-csf"),
        options: {
          legacyTemplate: false,
        },
      },
    ],
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
      // This is a bit weird, but for some reason this doesn't work when referenced via getAbsolutePath
      // see also: https://github.com/storybookjs/storybook/issues/24351#issuecomment-1777911065
      "@canonical/storybook-addon-baseline-grid",
      "@canonical/storybook-addon-shell-theme",
      ...frameworks[framework].addons,
      ...(opts.extraAddons ?? []),
    ].filter(
      (addon) =>
        !opts.disabledAddons?.some((disabledAddon) =>
          typeof addon === "string"
            ? addon === disabledAddon
            : addon.name === disabledAddon,
        ),
    ),
    framework: {
      name:
        framework === "react"
          ? getAbsolutePath("@storybook/react-vite")
          : getAbsolutePath("@storybook/svelte-vite"),
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
