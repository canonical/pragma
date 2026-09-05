/**
 * Which cascade layer a generated component stylesheet is wrapped in.
 *
 * `@canonical/styles` orders `ds.components.global` below `ds.components.app`,
 * so an application tier's rule for a component beats the global tier's by
 * cascade layer rather than by whichever bundle a loader happened to emit last.
 * A component scaffolded into an application-tier package therefore has to be
 * generated into `ds.components.app`; everything else belongs in
 * `ds.components.global`. Getting this from the target package rather than from
 * the author is the point: a wrong layer here is silent, and reintroduces the
 * source-order race the layers exist to end.
 */

import { readFileSync } from "node:fs";
import * as path from "node:path";

/** The global tier: the component packages every application gets. */
export const GLOBAL_COMPONENT_LAYER = "ds.components.global";

/** The application tier: one product's own components. */
export const APP_COMPONENT_LAYER = "ds.components.app";

/**
 * True when the directory is `packages/<framework>/ds-app` or
 * `packages/<framework>/ds-app-<product>`, the layout every application tier
 * in the repository uses. The bare `ds-app` form matters:
 * `packages/react/ds-app` and `packages/svelte/ds-app` are application tiers
 * with no product suffix.
 *
 * The match stops at a segment boundary rather than being a bare prefix, so a
 * future `packages/react/ds-approvals` is not read as an application tier.
 */
function isAppTierDirectory(dir: string): boolean {
  const segments = dir.split(/[/\\]/).filter(Boolean);
  return segments.some((segment, i) => {
    if (segment !== "packages") return false;
    const pkg = segments[i + 2] ?? "";
    return pkg === "ds-app" || pkg.startsWith("ds-app-");
  });
}

/**
 * Decide the layer from the two things that identify the target package: the
 * name in its manifest and the directory it sits in. An application tier is
 * named `…-ds-app` or `…-ds-app-<product>` (`@canonical/react-ds-app`,
 * `@canonical/react-ds-app-lxd`, `@canonical/svelte-ds-app`,
 * `@canonical/svelte-ds-app-wpe`) and lives in `packages/<framework>/ds-app`
 * or `packages/<framework>/ds-app-<product>`. Either signal alone is enough: a
 * package can be scaffolded before it is named, and a name can be read outside
 * this repository's directory layout.
 *
 * As with the directory, the name matches at a boundary — the end of the name
 * or the hyphen before the product — so `…-ds-approvals` stays global.
 *
 * Pure; exported for tests.
 */
export function componentLayerFor(
  packageName: string | undefined,
  dir: string,
): string {
  if (packageName && /-ds-app(-|$)/.test(packageName)) {
    return APP_COMPONENT_LAYER;
  }
  return isAppTierDirectory(dir) ? APP_COMPONENT_LAYER : GLOBAL_COMPONENT_LAYER;
}

/**
 * The layer for the package the generator is writing into, which is the working
 * directory: a component path is relative to it.
 *
 * A manifest that is missing or unreadable is not a failure — the directory
 * alone then decides, which is what a package scaffolded moments earlier needs.
 *
 * @note Impure — reads the filesystem.
 */
export default function resolveComponentLayer(
  cwd: string = process.cwd(),
): string {
  let name: string | undefined;
  try {
    name = (
      JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf-8")) as {
        name?: string;
      }
    ).name;
  } catch {
    // No readable manifest here — fall through to the directory.
  }
  return componentLayerFor(name, cwd);
}
