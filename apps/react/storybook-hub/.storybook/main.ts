import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createConfig } from "@canonical/storybook-config";

function getAddonPath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/manager`)));
}

const PACKAGES_ROOT = "../../../../packages/react";

const packages = [
  { dir: "ds-global", title: "Global" },
  { dir: "ds-global-form", title: "Global Form" },
  { dir: "ds-app", title: "App" },
  { dir: "ds-app-anbox", title: "App Anbox" },
  { dir: "ds-app-landscape", title: "App Landscape" },
  { dir: "ds-app-launchpad", title: "App Launchpad" },
  { dir: "ds-app-lxd", title: "App LXD" },
  { dir: "ds-app-portal", title: "App Portal" },
  { dir: "tokens", title: "Tokens" },
] as const;

const config = createConfig("react", {
  projectName: "Pragma Design System",
  staticDirs: packages.flatMap(({ dir }) => {
    const base = `${PACKAGES_ROOT}/${dir}`;
    return [`${base}/src/assets`, `${base}/public`];
  }),
  extraAddons: [
    getAddonPath("@canonical/storybook-addon-msw"),
    getAddonPath("@canonical/storybook-addon-form-state"),
  ],
});

export default {
  ...config,
  stories: [
    { directory: "../src", titlePrefix: "Hub" },
    ...packages.map(({ dir, title }) => ({
      directory: `${PACKAGES_ROOT}/${dir}/src`,
      titlePrefix: title,
    })),
  ],
};
