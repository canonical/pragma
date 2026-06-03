import { createRequire } from "node:module";
import type { Task } from "@canonical/task";
import { info } from "@canonical/task";

/**
 * Version range for the pragma workspace packages a generated app depends on
 * directly — react-ds-global(-form), react-head, react-hooks, react-ssr,
 * router-core, router-react, styles, storybook-config, biome-config,
 * typescript-config-react. These share one lerna-managed release line.
 *
 * Scope notes:
 * - Third-party deps (react, express, vite…) keep their own ranges.
 * - `@canonical/design-tokens` is versioned SEPARATELY and is NOT pinned here —
 *   it reaches the app transitively via `@canonical/styles`, which owns its range.
 *
 * A single hand-maintained constant — NOT read from a package.json at runtime,
 * because the generator ships as a compiled binary where such a read would
 * resolve to "unknown". Bump in lockstep with the lerna release.
 *
 * Open question: inject this at binary-build time once the compile pipeline
 * supports it, so it cannot drift from the release. See README "Open questions".
 */
export const PRAGMA_WORKSPACE_VERSION = "^0.27.1-experimental.0";

const require = createRequire(import.meta.url);

function readVersion(packageName: string): string {
  try {
    const pkg = require(`${packageName}/package.json`);

    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

const coreVersion = readVersion("@canonical/summon-core");
const appVersion = readVersion("@canonical/summon-application");

/**
 * Print a version table for the current generator run.
 */
export function printVersions(generatorName: string): Task<void> {
  return info(
    `@canonical/summon-core         ${coreVersion}\n` +
      `@canonical/summon-application  ${appVersion}  (${generatorName})`,
  );
}
