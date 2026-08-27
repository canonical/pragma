import { readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { Task } from "@canonical/task";
import { info, map } from "@canonical/task";

/**
 * Resolve the pragma workspace version range that a generated app should pin
 * for the @canonical/* packages it depends on directly — react-ds-global(-form),
 * react-head, react-hooks, react-ssr, router-core, router-react, styles,
 * storybook-config, biome-config, typescript-config-react. These share one
 * lerna-managed release line, so a single range covers all of them.
 *
 * Scope notes:
 * - Third-party deps (react, express, vite…) keep their own ranges.
 * - `@canonical/design-tokens` is versioned SEPARATELY and is NOT pinned here —
 *   it reaches the app transitively via `@canonical/styles`, which owns its range.
 *
 * Resolution is fully offline, by design: `pragma create` performs no network
 * calls. The generator pins the version of the release line it belongs to —
 * summon-application is published in lockstep with the workspace packages an
 * app depends on, so `^<own version>` is always release-correct, and two
 * scaffolds of the same generator are byte-identical (a registry lookup here
 * once made concurrent scaffolds race the network and diverge).
 */

const OWN_PACKAGE = "@canonical/summon-application";

/**
 * Walk up from `from` until a `package.json` names `packageName`, and return
 * its version. A manifest that is unreadable, is not JSON, names another
 * package, or carries no version is just an ancestor directory that happens to
 * hold a `package.json`, so the walk continues; running out of parents yields
 * "unknown".
 *
 * @note Impure — reads the filesystem.
 */
function findVersionAbove(from: string, packageName: string): string {
  let dir = from;
  for (;;) {
    try {
      const manifest = JSON.parse(
        readFileSync(path.join(dir, "package.json"), "utf-8"),
      ) as { name?: string; version?: string };
      if (manifest.name === packageName && manifest.version) {
        return manifest.version;
      }
    } catch {
      // No readable manifest at this level — keep walking.
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return "unknown";
    }
    dir = parent;
  }
}

/**
 * Read an installed package's version. Not `require("<pkg>/package.json")`:
 * none of the workspace packages export `./package.json` (and their ESM-only
 * exports maps make `require.resolve` itself throw), so module resolution is
 * avoided entirely — the standard `node_modules/<name>/package.json` location
 * is probed at each ancestor of this module instead, exactly the way node
 * itself would look the package up.
 *
 * @note Impure — reads the filesystem.
 */
export function readVersion(packageName: string): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (;;) {
    try {
      const manifest = JSON.parse(
        readFileSync(
          path.join(
            dir,
            "node_modules",
            ...packageName.split("/"),
            "package.json",
          ),
          "utf-8",
        ),
      ) as { version?: string };
      if (manifest.version) {
        return manifest.version;
      }
    } catch {
      // No such package at this level — keep walking.
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return "unknown";
    }
    dir = parent;
  }
}

/**
 * This generator's own version, read by walking up from THIS module — correct
 * from `src/` and from `dist/esm/` alike, with no build-layout coupling (see
 * summon-package's packageVersion for the full rationale). Lazy and cached so
 * importing this module performs no IO.
 */
let cachedOwnVersion: string | undefined;
export function ownVersion(): string {
  cachedOwnVersion ??= findVersionAbove(
    path.dirname(fileURLToPath(import.meta.url)),
    OWN_PACKAGE,
  );
  return cachedOwnVersion;
}

/**
 * The generator's own release-line version, used as the pinned range.
 * summon-application is published in lockstep with the workspace packages an app
 * depends on, so `^<own version>` is a safe, non-stale default. The module
 * always sits inside its own package, so the walk cannot miss in practice; the
 * "latest" escape survives only as a last resort for a mangled installation.
 */
function pinnedRange(): string {
  const own = ownVersion();
  return own === "unknown" ? "latest" : `^${own}`;
}

/**
 * Resolve the version range as a Task so the decision is visible in the
 * generator pipeline (dry-run included). Deterministic and offline: the range
 * comes from the installed generator's own release line.
 */
export function resolvePragmaVersion(): Task<string> {
  const pinned = pinnedRange();
  return map(
    info(
      `Pinning @canonical/* packages to ${pinned} (the installed generator's release line).`,
    ),
    () => pinned,
  );
}

/**
 * Print a version table for the current generator run.
 */
export function printVersions(generatorName: string): Task<void> {
  return info(
    `@canonical/summon-core         ${readVersion("@canonical/summon-core")}\n` +
      `@canonical/summon-application  ${ownVersion()}  (${generatorName})`,
  );
}
