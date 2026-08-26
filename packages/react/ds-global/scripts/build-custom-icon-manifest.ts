// Script to build example custom build manifest for the custom icons story

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAssetManifest } from "@canonical/ds-assets/build";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(
  packageRoot,
  "src",
  "lib",
  "component",
  "Icon",
  "customIconManifest.generated.ts",
);
buildAssetManifest({
  sourceDir: join(packageRoot, "src", "assets", "custom-icons"),
  outDir: join(packageRoot, "public", "custom-icons"),
  manifestPath,
});
