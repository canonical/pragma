import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createConfig } from "@canonical/storybook-config";

/**
 * The directory the Storybook MSW addon keeps its Mock Service Worker script
 * in, served beside the preview so a story's loader can register it.
 *
 * Taken from the addon rather than from msw itself: the repository's root
 * manifest names this directory as msw's worker directory, so installing msw
 * rewrites the script to match the installed version, and it holds that one
 * file where msw's own sits among its whole library.
 */
const workerDirectory = join(
  dirname(
    fileURLToPath(
      import.meta.resolve("@canonical/storybook-addon-msw/package.json"),
    ),
  ),
  "public",
);

// The server-backed stories start the worker in their own loaders, before
// they first render. The addon's decorator is not registered: it holds every
// story behind a loading placeholder and mounts it again once the worker
// starts, which loses what a play function did — in stories that reach no
// endpoint at all.
export default createConfig("react", { staticDirs: [workerDirectory] });
