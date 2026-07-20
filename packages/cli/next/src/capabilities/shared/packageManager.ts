/**
 * Storeless install-source heuristic, shared by `info`, `upgrade`, and
 * `doctor`'s `pragma version` check.
 *
 * Promotes the detector that lived inline in `info/collectInfo.ts`: the package
 * manager comes from npm's `npm_config_user_agent` (set by npm/pnpm/yarn/bun
 * when they run a script), the scope from whether the binary sits under
 * `node_modules`. With no agent we report the honest runtime rather than
 * guessing. The old shell's full package.json walk (`#package-manager`) is
 * dropped — only this heuristic and the update-command map survive.
 */

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
 * @note Impure — reads `process.argv`/`process.env`.
 */
export function detectInstallSource(): InstallSource {
  const bin = process.argv[1] ?? "";
  const scope = bin.includes("node_modules") ? "local" : "global";
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
