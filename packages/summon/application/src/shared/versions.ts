import { createRequire } from "node:module";
import { embeddedPackageVersion } from "@canonical/summon-core";
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

const require = createRequire(import.meta.url);

/**
 * A representative workspace package whose `latest` dist-tag tracks the shared
 * lerna release line. Any of the co-released packages would do; styles is a
 * root dependency of every generated app.
 */
const REPRESENTATIVE_PACKAGE = "@canonical/styles";

/**
 * Read a package's version — the installed tree first, then the host-injected
 * embedded store, then `"unknown"`.
 *
 * The installed tree stays primary: on disk it can never be stale. A
 * `bun build --compile` host is the one layout it cannot serve — no
 * `package.json` exists anywhere under the binary's virtual `/$bunfs`
 * filesystem — so such a host captures the declared generator packages'
 * versions at BUILD time (from the very manifests the require would read) and
 * injects them through summon-core's embedded store
 * (`setEmbeddedPackageVersions`). A compiled run then resolves the same value
 * a source run reads, and {@link fallbackRange} keeps pinning the release
 * line instead of degrading to `latest`. Same precedence contract as
 * summon-package's `resolveOwnVersion`. Exported for tests.
 *
 * @note Impure — reads the installed tree.
 */
export function readVersion(packageName: string): string {
  try {
    const pkg = require(`${packageName}/package.json`) as { version?: string };
    if (pkg.version) return pkg.version;
  } catch {
    // Not resolvable from the installed tree (`/$bunfs`, or an
    // exports-encapsulated manifest) — fall through to the embedded store.
  }
  return embeddedPackageVersion(packageName) ?? "unknown";
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
