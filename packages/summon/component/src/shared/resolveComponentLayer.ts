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
 * True when the directory sits under `packages/<framework>/ds-app-*`, the
 * layout every application tier in the repository uses.
 */
function isAppTierDirectory(dir: string): boolean {
  const segments = dir.split(/[/\\]/).filter(Boolean);
  return segments.some(
    (segment, i) =>
      segment === "packages" && (segments[i + 2] ?? "").startsWith("ds-app-"),
  );
}

/**
 * Decide the layer from the two things that identify the target package: the
 * name in its manifest and the directory it sits in. An application tier is
 * named `…-ds-app-…` (`@canonical/react-ds-app-lxd`,
 * `@canonical/svelte-ds-app-wpe`) and lives in `packages/<framework>/ds-app-*`.
 * Either signal alone is enough: a package can be scaffolded before it is
 * named, and a name can be read outside this repository's directory layout.
 *
 * Pure; exported for tests.
 */
export function componentLayerFor(
  packageName: string | undefined,
  dir: string,
): string {
  if (packageName?.includes("-ds-app-")) return APP_COMPONENT_LAYER;
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
