import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createConfig } from "@canonical/storybook-config";

function getAddonPath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/manager`)));
}

const config = createConfig("react", {
  projectName: "Pragma Design System",
  staticDirs: [
    "../../../packages/react/ds-global/src/assets",
    "../../../packages/react/ds-global/public",
    "../../../packages/react/ds-global-form/src/assets",
    "../../../packages/react/ds-app/src/assets",
    "../../../packages/react/ds-app/public",
    "../../../packages/react/ds-app-anbox/src/assets",
    "../../../packages/react/ds-app-anbox/public",
    "../../../packages/react/ds-app-landscape/src/assets",
    "../../../packages/react/ds-app-landscape/public",
    "../../../packages/react/ds-app-launchpad/src/assets",
    "../../../packages/react/ds-app-launchpad/public",
    "../../../packages/react/ds-app-lxd/src/assets",
    "../../../packages/react/ds-app-lxd/public",
    "../../../packages/react/ds-app-portal/src/assets",
    "../../../packages/react/ds-app-portal/public",
  ],
  extraAddons: [
    getAddonPath("@canonical/storybook-addon-msw"),
    getAddonPath("@canonical/storybook-addon-form-state"),
  ],
});

export default {
  ...config,
  stories: [
    // Hub intro
    { directory: "../src", titlePrefix: "Hub" },
    // Global
    {
      directory: "../../../packages/react/ds-global/src",
      titlePrefix: "Global",
    },
    // Global Form
    {
      directory: "../../../packages/react/ds-global-form/src",
      titlePrefix: "Global Form",
    },
    // App (base)
    {
      directory: "../../../packages/react/ds-app/src",
      titlePrefix: "App",
    },
    // App Anbox
    {
      directory: "../../../packages/react/ds-app-anbox/src",
      titlePrefix: "App Anbox",
    },
    // App Landscape
    {
      directory: "../../../packages/react/ds-app-landscape/src",
      titlePrefix: "App Landscape",
    },
    // App Launchpad
    {
      directory: "../../../packages/react/ds-app-launchpad/src",
      titlePrefix: "App Launchpad",
    },
    // App LXD
    {
      directory: "../../../packages/react/ds-app-lxd/src",
      titlePrefix: "App LXD",
    },
    // App Portal
    {
      directory: "../../../packages/react/ds-app-portal/src",
      titlePrefix: "App Portal",
    },
    // Tokens
    {
      directory: "../../../packages/react/tokens/src",
      titlePrefix: "Tokens",
    },
  ],
};
