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

/** The install source: package manager, scope, and a display label. */
export interface InstallSource {
  /** Package-manager name (`bun`/`npm`/`pnpm`/`yarn`), else the honest runtime. */
  readonly pm: string;
  /** Whether the binary is a local `node_modules` install or global. */
  readonly scope: "local" | "global";
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
 * @returns The install source (pm, scope, label).
 * @note Impure — reads `process.argv`/`process.env`.
 */
export function detectInstallSource(): InstallSource {
  const bin = process.argv[1] ?? "";
  const scope: "local" | "global" = bin.includes("node_modules")
    ? "local"
    : "global";
  const pm = packageManager();
  return { pm, scope, label: `${pm} (${scope})` };
}
