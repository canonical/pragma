import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: ["./local-preset.cjs"],
  framework: "@storybook/react-vite",
  core: { disableTelemetry: true },
};

export default config;
