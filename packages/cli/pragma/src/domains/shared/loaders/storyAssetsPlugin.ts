/**
 * Build-time bundler plugin: embed story-pack JSON as file assets.
 *
 * Bun compiles `.json` build inputs into JSON modules, which never
 * surface in `Bun.embeddedFiles`. Story-pack files must instead be
 * embedded as file assets — like TTL graphs — so the bundled loader can
 * serve them inside the compiled binary. This plugin scopes the `file`
 * loader to story paths only, leaving every other JSON input (e.g.
 * `package.json` imported for the CLI version) compiled as a module.
 *
 * Contract with the bundled loader: story files are the only `.json`
 * content embedded as file assets, so every `.json` blob in
 * `Bun.embeddedFiles` that is not named like a package manifest is a
 * story definition. Consequence: no module in the bundle may import a
 * `stories/*.json` file as a JSON module — the plugin would rewrite
 * such an import into a file-path string.
 *
 * Consumed by `scripts/build.ts` only; never bundled into the binary.
 */

import { readFileSync } from "node:fs";
import type { BunPlugin } from "bun";

/**
 * Matches story-pack files: a `.json` directly inside a `stories/`
 * directory — the same non-recursive scope the local loader scans.
 */
export const STORY_ASSET_PATH_PATTERN = /[\\/]stories[\\/][^\\/]+\.json$/;

/**
 * Create the bundler plugin that embeds `stories/*.json` as file assets.
 *
 * @returns A `Bun.build` plugin for the compiled-binary build.
 * @note Impure — the registered load callback reads the filesystem.
 */
export default function createStoryAssetsPlugin(): BunPlugin {
  return {
    name: "story-assets",
    setup(build) {
      build.onLoad({ filter: STORY_ASSET_PATH_PATTERN }, (args) => ({
        contents: readFileSync(args.path, "utf-8"),
        loader: "file",
      }));
    },
  };
}
