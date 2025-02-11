import { createConfig } from "@canonical/storybook-config";

import { dirname, join } from "node:path";

function getAbsolutePath(value: string): string {
  return dirname(require.resolve(join(value, "package.json")));
}

const config = createConfig(getAbsolutePath);

export default config;
