/**
 * What the package being generated into says about its cascade layer.
 *
 * The answer belongs to that package, not to this generator: a design system's
 * layer names and the file its order statement lives in are that design
 * system's business. `@canonical/summon-core` reads the two strings out of a
 * manifest; this module finds the manifest, which is the part that needs a
 * filesystem.
 *
 * A package that says nothing gets stylesheets with no layer wrapper.
 */

import { readFileSync } from "node:fs";
import * as path from "node:path";
import {
  layerSettingsFrom,
  type ManifestWithLayer,
  type SummonLayerSettings,
} from "@canonical/summon-core";

export type { SummonLayerSettings };
export { layerSettingsFrom };

/**
 * The layer settings of the package the generator is writing into, which is the
 * working directory: a component path is relative to it.
 *
 * A manifest that is missing or unreadable is not a failure; it means the
 * package has said nothing, and the stylesheet is generated unwrapped.
 *
 * @note Impure — reads the filesystem.
 */
export default function resolveComponentLayer(
  cwd: string = process.cwd(),
): SummonLayerSettings {
  try {
    const manifest = JSON.parse(
      readFileSync(path.join(cwd, "package.json"), "utf-8"),
    ) as ManifestWithLayer;
    return layerSettingsFrom(manifest);
  } catch {
    return layerSettingsFrom(undefined);
  }
}
