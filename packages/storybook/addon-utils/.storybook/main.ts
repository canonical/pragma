import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createConfig } from "@canonical/storybook-config";

function getAddonPath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/manager`)));
}

const config = createConfig("react", {
  staticDirs: [],
  extraAddons: ["./local-preset.cjs"],
  disabledAddons: [getAddonPath("@canonical/storybook-addon-utils")],
});

export default { ...config };
