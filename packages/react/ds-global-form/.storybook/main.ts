import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createConfig } from "@canonical/storybook-config";

function getAddonPath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/manager`)));
}

export default createConfig("react", {
  staticDirs: ["../src/assets"],
  extraAddons: [
    getAddonPath("@canonical/storybook-addon-msw"),
    getAddonPath("@canonical/storybook-addon-form-state"),
  ],
});
