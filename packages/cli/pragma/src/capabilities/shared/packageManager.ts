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

import { isAbsolute, relative, resolve, sep } from "node:path";
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
/**
 * The directory a package was installed INTO — the parent of the `node_modules`
 * holding it, so `/proj/node_modules/@scope/x/dist/bin.js` yields `/proj`.
 *
 * The LAST occurrence, because nested `node_modules` mean the innermost one is
 * the tree the entry actually lives in.
 *
 * @param entry - Absolute path to the running module.
 * @returns The install root, or `undefined` when the entry is not installed at
 *   all (a source checkout, where no `node_modules` segment appears).
 * @remarks Exported for its unit test; not part of the package's public surface.
 */
export function findInstallRoot(entry: string): string | undefined {
  const segments = entry.split(sep);
  const index = segments.lastIndexOf("node_modules");
  return index === -1 ? undefined : segments.slice(0, index).join(sep);
}

/**
 * Whether `directory` contains `candidate`, or is it.
 *
 * Compared through `relative()` rather than a string prefix: a prefix test needs
 * a hard-coded separator (wrong on Windows) and would call `/proj-two` a child
 * of `/proj`.
 *
 * @param directory - The containing directory.
 * @param candidate - The path to test.
 * @returns True when `candidate` is `directory` or sits beneath it.
 * @remarks Exported for its unit test; not part of the package's public surface.
 */
export function containsPath(directory: string, candidate: string): boolean {
  const offset = relative(directory, candidate);
  return offset === "" || (!offset.startsWith("..") && !isAbsolute(offset));
}

export function detectInstallSource(): InstallSource {
  // The entry's own location, NOT `process.argv[1]`. Under the compiled binary
  // argv[1] was the user's FIRST ARGUMENT (the executable was argv[0]), so the
  // old `includes("node_modules")` test read a command word and answered
  // "global" for almost everything. Shipping `node dist/src/bin.js` moves the
  // entry path INTO argv[1], where it always contains `node_modules` — which
  // would answer "local" for everything, the same bug facing the other way.
  // `import.meta.url` is the honest source either way.
  const entry = fileURLToPath(import.meta.url);
  // LOCAL means the working directory sits inside the project this package was
  // installed into — not merely that the entry sits under the cwd. Asking the
  // narrower question called a perfectly ordinary local install "global" the
  // moment the user ran it from a subdirectory, which in a monorepo is the
  // usual case. Going the other way, deriving the install root also settles the
  // $HOME-nested global prefixes (nvm, `~/.npm-global`): their root is the
  // prefix, which contains no user project.
  const root = findInstallRoot(entry);
  const scope =
    root !== undefined && containsPath(root, resolve(process.cwd()))
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
