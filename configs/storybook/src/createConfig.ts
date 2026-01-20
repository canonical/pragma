import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(value + "/package.json")));
}

type CreateConfigOptions = {
  staticDirs?: string[];
  extraAddons?: string[];
  disabledAddons?: string[];
};

const createConfig = (options: CreateConfigOptions = {}): StorybookConfig => ({
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    getAbsolutePath("@chromatic-com/storybook"),
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-vitest"),
    getAbsolutePath("@storybook/addon-themes"),
    // // This is a bit weird, but for some reason this doesn't work when referenced via getAbsolutePath
    // // see also: https://github.com/storybookjs/storybook/issues/24351#issuecomment-1777911065
    "@canonical/storybook-addon-baseline-grid",
    ...(options.extraAddons || []),
  ].filter((addon) => !options.disabledAddons?.includes(addon)),
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
  staticDirs: [
    ...(options.staticDirs || []),
    getAbsolutePath("@canonical/ds-assets"),
  ],
});

export default createConfig;
