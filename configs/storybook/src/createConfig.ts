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
  sveltekit: {
    framework: getAbsolutePath("@storybook/sveltekit"),
    addons: [getAbsolutePath("@storybook/addon-svelte-csf")],
  },
  lit: {
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
  refs?: StorybookConfig["refs"];
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
      getAddonPath("@canonical/storybook-addon-utils"),
      getAddonPath("@canonical/storybook-addon-shell-theme"),
      ...frameworks[framework].addons,
      ...(opts.extraAddons ?? []),
    ].filter((addon) => !opts.disabledAddons?.includes(addon)),
    framework: {
      name: frameworks[framework].framework,
      options: {},
    },
    // Establish the full-height chain in the preview iframe so components with
    // `height: 100%` (e.g. application layouts, SideNavigation) resolve against
    // a real height. Storybook does not set this by default.
    previewHead: (head) =>
      `${head}\n<style>html, body, #storybook-root, #root-inner, #root { height: 100%; }</style>`,
    core: {
      disableTelemetry: true,
    },
    typescript: {
      check: true,
    },
    staticDirs: [
      ...(opts.staticDirs ?? []),
      getAbsolutePath("@canonical/ds-assets"),
      // `Icon` resolves icons through `ICON_MANIFEST`'s content-hashed
      // filenames by default (see ds-assets/docs/ICONS.md), which live in
      // `dist/icons/`, not the plain `icons/` the mount above exposes at
      // `/icons`. Overlay the hashed set at the same `/icons` path so
      // Storybook serves what `Icon` actually requests; filenames don't
      // collide with the unhashed ones other components (e.g. `Spinner`)
      // still reference from the mount above.
      {
        from: `${getAbsolutePath("@canonical/ds-assets")}/dist/icons`,
        to: "/icons",
      },
    ],
    env: {
      PROJECT_NAME: opts.projectName ?? "",
      PROJECT_LOGO: opts.projectLogo ?? "",
    },
    ...(opts.refs ? { refs: opts.refs } : {}),
  };
}

export default createConfig;
