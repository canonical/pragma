/**
 * Which cascade layer a generated component stylesheet is wrapped in.
 *
 * The tier tree and the name→layer mapping live in `@canonical/summon-core`,
 * because the package generator needs the same rule for the CSS entry it
 * scaffolds, and a tier tree written down twice is a tier tree that drifts.
 * This module is the component generator's side of it: finding the package
 * being generated into, which the mapping cannot do for itself.
 *
 * Owner ruling 2026-09-06 (VC.31).
 */

import { readFileSync } from "node:fs";
import * as path from "node:path";
import {
  componentLayerFor,
  GLOBAL_COMPONENT_LAYER,
} from "@canonical/summon-core";

export { componentLayerFor, GLOBAL_COMPONENT_LAYER };

/**
 * The layer for the package the generator is writing into, which is the working
 * directory: a component path is relative to it.
 *
 * The manifest name decides. A manifest that is missing or unreadable is not a
 * failure — the directory's own name is then read as the package name, which is
 * what a package scaffolded moments earlier needs, and what the repository's
 * `packages/<framework>/<name>` layout makes true.
 *
 * @note Impure — reads the filesystem.
 */
export default function resolveComponentLayer(
  cwd: string = process.cwd(),
): string {
  try {
    const name = (
      JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf-8")) as {
        name?: string;
      }
    ).name;
    if (name) return componentLayerFor(name);
  } catch {
    // No readable manifest here — fall through to the directory.
  }
  return componentLayerFor(path.basename(cwd));
}
