import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: ["./local-preset.js"],
  framework: "@storybook/react-vite",
  core: { disableTelemetry: true },
  staticDirs: ["../public"],
};

export default config;
