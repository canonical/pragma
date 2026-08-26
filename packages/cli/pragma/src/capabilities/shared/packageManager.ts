/**
 * Storeless install-source heuristic, shared by `info`, `upgrade`, and
 * `doctor`'s `pragma version` check.
 *
 * Promotes the detector that lived inline in `info/collectInfo.ts`: the package
 * manager comes from npm's `npm_config_user_agent` (set by npm/pnpm/yarn/bun
 * when they run a script), the scope from whether the installed entry sits
 * under the CURRENT PROJECT. With no agent we report the honest runtime rather
 * than guessing. The old shell's full package.json walk (`#package-manager`) is
 * dropped — only this heuristic and the update-command map survive.
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The install source: package manager and a display label. */
export interface InstallSource {
  /** Package-manager name (`bun`/`npm`/`pnpm`/`yarn`), else the honest runtime. */
  readonly pm: string;
  /** `${pm} (${scope})` — the string `info`/`doctor` display. */
  readonly label: string;
}

/** The package manager from npm's user-agent, else the honest runtime. */
function packageManager(): string {
  const agent = process.env.npm_config_user_agent;
  const name = agent?.split("/")[0];
  if (name) return name;
  return process.versions.bun ? "bun" : "node";
}

/**
 * Detect how the binary was installed — package manager and scope.
 *
 * @returns The install source (pm, label).
 * @note Impure — reads `import.meta.url`, the working directory, and `process.env`.
 */
export function detectInstallSource(): InstallSource {
  // The entry's own location, NOT `process.argv[1]`. Under the compiled binary
  // argv[1] was the user's FIRST ARGUMENT (the executable was argv[0]), so the
  // old `includes("node_modules")` test read a command word and answered
  // "global" for almost everything. Shipping `node dist/src/bin.js` moves the
  // entry path INTO argv[1], where it always contains `node_modules` — which
  // would answer "local" for everything, the same bug facing the other way.
  // `import.meta.url` is the honest source either way.
  const entry = fileURLToPath(import.meta.url);
  // Local means "installed into this project": a global prefix lives outside
  // the working tree. Resolved so a symlinked `node_modules/.bin` shim does not
  // decide it. A project nested under the global prefix would read as global —
  // an accepted corner, and quieter than the reverse.
  const scope = entry.startsWith(`${resolve(process.cwd())}/`)
    ? "local"
    : "global";
  const pm = packageManager();
  return { pm, label: `${pm} (${scope})` };
}

/** The npm global-update command — also the fallback for an unknown manager. */
const npmUpdateCommand = (pkg: string): string => `npm i -g ${pkg}`;

/** The global-update command per package manager (install-style). */
const PM_UPDATE_COMMAND: Record<string, (pkg: string) => string> = {
  bun: (pkg) => `bun add -g ${pkg}`,
  npm: npmUpdateCommand,
  pnpm: (pkg) => `pnpm add -g ${pkg}`,
  yarn: (pkg) => `yarn global add ${pkg}`,
};

/**
 * The command that updates `pkg` globally for a package manager.
 *
 * @param pm - The package-manager name (`bun`/`npm`/`pnpm`/`yarn`).
 * @param pkg - The package to update.
 * @returns The shell command; falls back to npm for an unknown manager.
 */
export function pmUpdateCommand(pm: string, pkg: string): string {
  return (PM_UPDATE_COMMAND[pm] ?? npmUpdateCommand)(pkg);
}
