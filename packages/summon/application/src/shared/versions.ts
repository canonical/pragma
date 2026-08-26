import { readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExecResult, Task } from "@canonical/task";
import { exec, flatMap, info, map, pure, recover } from "@canonical/task";

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
 * Resolution strategy (in order):
 * 1. At summon time, query the npm registry for the latest published version of
 *    a representative workspace package and pin `^<latest>`. This keeps freshly
 *    scaffolded apps on the newest release without a manual bump here.
 * 2. If the query fails (offline, registry down, npm missing), fall back to the
 *    version of the generator itself — because summon-application is released in
 *    lockstep with the rest of the workspace, its own version is the correct
 *    release line for the app it just generated. This is always at least as
 *    fresh as the generator binary in use.
 */

/**
 * A representative workspace package whose `latest` dist-tag tracks the shared
 * lerna release line. Any of the co-released packages would do; styles is a
 * root dependency of every generated app.
 */
const REPRESENTATIVE_PACKAGE = "@canonical/styles";

/**
 * Walk up from `from` until a manifest IS `packageName`'s, and return its
 * `version` — either an ancestor `package.json` whose `name` matches (the
 * generator's own package, found from `src/` and `dist/esm/` alike) or an
 * ancestor `node_modules/<packageName>/package.json` (an installed
 * dependency, probed directly the way module resolution walks directories —
 * no `exports` gate applies to a filesystem read, so an
 * exports-encapsulated manifest resolves the same under node and bun).
 * Mirrors summon-package's `findOwnVersion` in shape; a manifest that is
 * unreadable, is not JSON, names another package, or carries no version is
 * just an ancestor to walk past. Running out of parents yields `undefined`
 * (the callers degrade, so nothing throws).
 *
 * A `/$bunfs`-anchored walk (a `bun build --compile` host) refuses to start:
 * the parent chain LEAVES the virtual filesystem (`/$bunfs/root` → `/$bunfs`
 * → `/`), and `/package.json` / `/node_modules/<name>/package.json` are REAL
 * paths — measured: a root-level `node_modules` decoy made the shipped
 * binary pin the decoy's version, bypassing the embedded store. Compiled
 * hosts are served by the store; the walk yields `undefined` immediately.
 *
 * @note Impure — reads the filesystem.
 */
function findInstalledVersion(
  from: string,
  packageName: string,
): string | undefined {
  const versionAt = (manifestPath: string): string | undefined => {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
        name?: string;
        version?: string;
      };
      if (manifest.name === packageName && manifest.version) {
        return manifest.version;
      }
    } catch {
      // No readable manifest at this path — keep walking.
    }
    return undefined;
  };
  let dir = from;
  for (;;) {
    const found =
      versionAt(path.join(dir, "package.json")) ??
      versionAt(path.join(dir, "node_modules", packageName, "package.json"));
    if (found !== undefined) return found;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Read a package's version — the installed tree first, then the host-injected
 * embedded store, then `"unknown"`.
 *
 * The installed tree stays primary: on disk it can never be stale. The tree
 * tier is the {@link findInstalledVersion} WALK, not a
 * `require("<pkg>/package.json")`: neither `@canonical/summon-core` nor
 * `@canonical/summon-application` — the names this module resolves — exposes
 * a `"./package.json"` subpath in its exports map, so the subpath require
 * throws ERR_PACKAGE_PATH_NOT_EXPORTED under plain Node — the summon bin's
 * shipped runtime — and only the walk keeps BOTH shipped products on the
 * tree tier. A `bun build --compile` host is the one layout the walk refuses
 * to serve: no `package.json` exists inside the binary's virtual `/$bunfs`
 * filesystem, and walking PAST it would probe the real filesystem root — so
 * {@link findInstalledVersion} yields `undefined` from a `/$bunfs` anchor,
 * and such a host captures the declared generator packages' versions at
 * BUILD time (from the very manifests the walk would read) and injects them
 * through summon-core's embedded store (`setEmbeddedPackageVersions`). A
 * compiled run then resolves the same value a source run reads, and
 * {@link fallbackRange} keeps pinning the release line instead of degrading
 * to `latest`. Same precedence contract as summon-package's
 * `resolveOwnVersion` — walk first, embedded store second — with
 * `"unknown"` in place of its terminal throw. Exported for tests; `anchor`
 * is injectable so the `/$bunfs` refusal is pinnable without a compiled
 * host.
 *
 * @note Impure — reads the installed tree.
 */
export function readVersion(
  packageName: string,
  anchor: string = path.dirname(fileURLToPath(import.meta.url)),
): string {
  return findInstalledVersion(anchor, packageName) ?? "unknown";
}

/**
 * The generator's own release-line version, used as the offline fallback range.
 * summon-application is published in lockstep with the workspace packages an app
 * depends on, so `^<own version>` is a safe, non-stale default. Resolved via
 * {@link readVersion}, so a compiled binary pins the host-injected build-time
 * version; `latest` remains only the last resort when neither the installed
 * tree nor a host injection knows the version.
 */
function fallbackRange(): string {
  const own = readVersion("@canonical/summon-application");
  return own === "unknown" ? "latest" : `^${own}`;
}

const coreVersion = readVersion("@canonical/summon-core");
const appVersion = readVersion("@canonical/summon-application");

const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

/**
 * Resolve the version range as a Task, so the npm query participates in the
 * generator pipeline (dry-run visible, cancellable) instead of firing on module
 * import. Runs `npm view <pkg> version`; on any failure or unparseable output it
 * yields the offline fallback range.
 *
 * @note Impure — spawns `npm` and reads the registry over the network.
 */
export function resolvePragmaVersion(): Task<string> {
  const fallback = fallbackRange();
  return flatMap(
    // A missing `npm` binary makes the spawn reject (a task failure) rather
    // than resolve with a nonzero exit code, so recover to a synthetic failed
    // ExecResult. Both spawn errors and nonzero exits then flow through the
    // single fallback branch below.
    recover(
      exec("npm", ["view", REPRESENTATIVE_PACKAGE, "version"], undefined, {
        // Best-effort lookup — never let a registry miss undo prior file writes.
        undo: null,
      }),
      () => pure<ExecResult>({ stdout: "", stderr: "", exitCode: 1 }),
    ),
    (result) => {
      const latest = result.stdout.trim();
      if (result.exitCode === 0 && SEMVER.test(latest)) {
        return map(
          info(`Pinning @canonical/* packages to ^${latest} (latest on npm).`),
          () => `^${latest}`,
        );
      }
      return map(
        info(
          `Could not reach npm for the latest @canonical/* version; ` +
            `pinning ${fallback} (from the installed generator).`,
        ),
        () => fallback,
      );
    },
  );
}

/**
 * Print a version table for the current generator run.
 */
export function printVersions(generatorName: string): Task<void> {
  return info(
    `@canonical/summon-core         ${coreVersion}\n` +
      `@canonical/summon-application  ${appVersion}  (${generatorName})`,
  );
}
