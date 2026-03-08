import { createConfig } from "@canonical/storybook-config";

const config = createConfig("react", {
  staticDirs: ["../src/assets", "../public"],
});

export default {
  ...config,
  stories: [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx|svelte)",
    "!../src/lib/Tokens.stories.tsx",
    "!../src/lib/Typography.stories.tsx",
  ],
};
