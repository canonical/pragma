/**
 * Storeless install-source detector, shared by `info`, `upgrade`, and
 * `doctor`'s `pragma version` check.
 *
 * Detection is driven by the FILESYSTEM — the resolved entry path, the invoked
 * bin path, and the symlinks between them — not by environment variables. The
 * previous heuristic read `npm_config_user_agent`, which npm/pnpm/yarn/bun set
 * only when THEY run a script; a user typing the bin name in a shell never has
 * it, so on the path that mattered the detector always fell through to the
 * honest runtime and reported `node` for every install. The agent survives
 * only as a last-resort corroboration for a workspace install whose tree
 * carries no other marker.
 *
 * The two paths that matter, and why both are needed:
 *
 * - `import.meta.url` is REALPATH-RESOLVED by the module loader. For a normal
 *   install it sits inside `node_modules/<pkg>`; for a linked development
 *   install (`npm link` / `bun link`) it has already escaped to the source
 *   checkout and contains no `node_modules` at all — which is precisely why an
 *   entry-only detector cannot see a link.
 * - `process.argv[1]` preserves the path the user actually invoked, symlinks
 *   intact. Walking its link chain finds the `node_modules/<pkg>` entry the
 *   bin points through, and whether THAT directory is itself a symlink
 *   pointing outside the install root — the linked-install signal. The chain
 *   is only trusted when the package directory it names really contains the
 *   running module (`realPath` identity check), so a foreign bin on argv[1]
 *   (vitest, a wrapper script) never misattributes the install.
 *
 * The manager is identified by path SHAPE (`.bun/`, `.pnpm`/`pnpm`, `.volta`,
 * `.asdf`, yarn's global dir), ephemeral runners by their cache shapes
 * (`_npx`, `bunx-*`, pnpm's `dlx`), and a workspace's manager by the lockfile
 * beside the install root. When no signal is conclusive the detector answers
 * `unknown` — a state with NO update command, because a confidently wrong
 * `npm i -g` is worse than none (against a linked checkout it would overwrite
 * the link to the tree being developed). `pmUpdateCommand` accepts only the
 * {@link GlobalInstall} arm, so offering a command to any other state is a
 * type error, not a convention.
 *
 * Read-only and storeless: a handful of `lstat`/`readlink`/`realpath`/`exists`
 * probes, bounded by the link-chain cap — nothing is ever written. The module
 * sits on the fast-path static graph (via the shared barrel), so all probing
 * happens at call time; module load stays inert.
 *
 * Windows note: segment matching splits on both separators, so the SHAPE
 * checks (`managerFromPath`, `ephemeralRunner`) are exercised against
 * win32-style fixtures — but scope containment goes through the host's
 * `node:path` and, like `platformPaths.ts`, the win32 arm is a conventional
 * best guess that has NOT been validated on a real Windows machine.
 */

import { existsSync, readlinkSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  INSTALL_UPDATE_GUIDANCE,
  installSourceLabel,
} from "../../kernel/render/vocabulary.js";

/** The package managers the detector can name (volta counts: it owns the
 * install and its own update command). */
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "volta";

/** The ephemeral runners — cache-resolved, with no meaningful upgrade. */
export type EphemeralRunner = "npx" | "bunx" | "pnpm dlx";

/** A global install by a known manager — the ONLY updatable state. */
export interface GlobalInstall {
  readonly kind: "global";
  readonly pm: PackageManager;
  readonly label: string;
}

/** Installed as a dependency of the project the command runs in. */
export interface WorkspaceInstall {
  readonly kind: "workspace";
  /** The project's manager, when a lockfile/shape/agent names one. */
  readonly pm?: PackageManager;
  /** The project directory the package is installed into. */
  readonly root: string;
  readonly label: string;
}

/** A linked development install: `node_modules/<pkg>` is a symlink pointing
 * OUTSIDE the install root (`npm link` / `bun link` / `pnpm link`). */
export interface LinkedInstall {
  readonly kind: "linked";
  /** The manager whose global tree hosts the link, when its shape names one. */
  readonly pm?: PackageManager;
  /** The resolved link target — the development checkout. */
  readonly target: string;
  readonly label: string;
}

/** An `npx`/`bunx`/`pnpm dlx` run out of a runner cache. */
export interface EphemeralInstall {
  readonly kind: "ephemeral";
  readonly runner: EphemeralRunner;
  readonly label: string;
}

/** No conclusive signal — report the honest runtime and offer nothing. */
export interface UnknownInstall {
  readonly kind: "unknown";
  readonly runtime: "node" | "bun";
  readonly label: string;
}

/** The install source — a closed union; only {@link GlobalInstall} updates. */
export type InstallSource =
  | GlobalInstall
  | WorkspaceInstall
  | LinkedInstall
  | EphemeralInstall
  | UnknownInstall;

/**
 * Everything the classifier reads, captured as a value so tests drive any
 * layout as a fixture — the `PlatformEnv` pattern from
 * `@canonical/harnesses/platformPaths.ts`, with the filesystem probes
 * injected the way `detectWsl` injects its `/proc/version` reader.
 */
export interface InstallProbe {
  /** The running module's own path (`import.meta.url`, realpath-resolved). */
  readonly entry: string;
  /** The invoked script path (`process.argv[1]`), symlinks preserved. */
  readonly invoked: string | undefined;
  readonly cwd: string;
  /** `npm_config_user_agent` — corroboration only, absent on a bare run. */
  readonly userAgent: string | undefined;
  readonly runtime: "node" | "bun";
  /** A symlink's raw target, or `undefined` when not a symlink/unreadable. */
  readonly readLink: (path: string) => string | undefined;
  /** Fully-resolved real path, or `undefined` when unresolvable. */
  readonly realPath: (path: string) => string | undefined;
  readonly exists: (path: string) => boolean;
}

/** Split on both separators, so shape checks read win32 paths too. */
const splitPath = (path: string): string[] => path.split(/[\\/]/);

/** The separator the input path itself uses (win32 fixtures keep theirs). */
const sepOf = (path: string): string => (path.includes("\\") ? "\\" : "/");

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
  const segments = splitPath(entry);
  const index = segments.lastIndexOf("node_modules");
  return index === -1 ? undefined : segments.slice(0, index).join(sepOf(entry));
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

/** A located installed package: its tree's root and its own directory. */
interface LocatedPackage {
  /** The directory the package was installed into (parent of node_modules). */
  readonly root: string;
  /** The `node_modules/<pkg>` directory itself (scoped-aware). */
  readonly pkgDir: string;
}

/**
 * Locate the `node_modules` package a path sits inside — root and package
 * directory, scope-aware. `node_modules/.bin/...` is NOT a package (the shim
 * there is a symlink the chain walk should follow instead).
 */
function locatePackage(path: string): LocatedPackage | undefined {
  const segments = splitPath(path);
  const index = segments.lastIndexOf("node_modules");
  if (index === -1) return undefined;
  const first = segments[index + 1];
  if (first === undefined || first === ".bin") return undefined;
  const span = first.startsWith("@") ? 2 : 1;
  if (span === 2 && segments[index + 2] === undefined) return undefined;
  const sep = sepOf(path);
  return {
    root: segments.slice(0, index).join(sep),
    pkgDir: segments.slice(0, index + 1 + span).join(sep),
  };
}

/** The manager a path's shape names, or `undefined` when it names none. */
export function managerFromPath(path: string): PackageManager | undefined {
  const segments = splitPath(path).map((s) => s.toLowerCase());
  const has = (name: string): boolean => segments.includes(name);
  if (has(".bun")) return "bun";
  if (has(".pnpm") || has("pnpm")) return "pnpm";
  if (
    has(".volta") ||
    segments.some((s, i) => s === "volta" && segments[i + 1] === "tools")
  ) {
    return "volta";
  }
  // asdf/nvm host an ordinary npm global tree inside a versioned node install.
  if (has(".asdf") || has(".nvm")) return "npm";
  const yarn = segments.findIndex((s) => s === "yarn" || s === ".yarn");
  if (yarn !== -1 && segments.indexOf("global", yarn) !== -1) return "yarn";
  return undefined;
}

/**
 * The ephemeral runner a path's cache shape names, if any.
 *
 * Each pattern is anchored to the runner's ACTUAL cache layout, not to a bare
 * directory name appearing anywhere in the path. A loose match reclassifies an
 * ordinary project — `/work/dlx/app`, or anything under a directory someone
 * named `_npx` — as ephemeral, and because that verdict is reached BEFORE the
 * workspace containment check it wins even when a lockfile sits beside the
 * root. The failure is quiet rather than loud: an ephemeral install correctly
 * offers no upgrade command, so the user simply never learns how to update.
 */
export function ephemeralRunner(path: string): EphemeralRunner | undefined {
  const segments = splitPath(path);
  // npx caches at `<npm cache>/_npx/<hash>/…` — `~/.npm` on unix,
  // `%LOCALAPPDATA%\npm-cache` on Windows.
  const npx = segments.indexOf("_npx");
  const npxParent = npx > 0 ? segments[npx - 1] : undefined;
  if (npxParent === ".npm" || npxParent === "npm-cache") return "npx";
  // bunx materialises `$TMPDIR/bunx-<uid>-<pkg>@<ver>/…`; requiring the uid
  // keeps a hand-made `bunx-tools` directory from matching.
  if (segments.some((s) => /^bunx-\d+-/.test(s))) return "bunx";
  // pnpm caches at `<pnpm cache>/dlx/<hash>/…`.
  const dlx = segments.indexOf("dlx");
  if (dlx > 0 && segments[dlx - 1] === "pnpm") return "pnpm dlx";
  return undefined;
}

/** The lockfile beside an install root, mapped to its manager. */
function lockfileManager(
  root: string,
  exists: InstallProbe["exists"],
  sep: string,
): PackageManager | undefined {
  const beside = (name: string): boolean => exists(`${root}${sep}${name}`);
  if (beside("bun.lock") || beside("bun.lockb")) return "bun";
  if (beside("pnpm-lock.yaml")) return "pnpm";
  if (beside("yarn.lock")) return "yarn";
  if (beside("package-lock.json")) return "npm";
  return undefined;
}

/** The manager `npm_config_user_agent` names, when present and recognized. */
function agentManager(agent: string | undefined): PackageManager | undefined {
  const name = agent?.split("/")[0];
  return name === "npm" || name === "pnpm" || name === "yarn" || name === "bun"
    ? name
    : undefined;
}

/** The link-chain hop cap — a symlink cycle must not spin the detector. */
const MAX_LINK_HOPS = 10;

/**
 * Walk `argv[1]`'s symlink chain to the `node_modules` entry it points
 * through, and trust it only when that package directory really contains the
 * running module. Returns the FIRST chain path inside a package — before the
 * package-level symlink is resolved away, which is where the linked-install
 * signal lives.
 */
function resolveInvokedEntry(probe: InstallProbe): string | undefined {
  if (probe.invoked === undefined) return undefined;
  let path = resolve(probe.cwd, probe.invoked);
  for (let hop = 0; hop < MAX_LINK_HOPS; hop++) {
    const located = locatePackage(path);
    if (located !== undefined) {
      // Identity check: only OUR package's bin may classify this process.
      const real = probe.realPath(located.pkgDir);
      return real !== undefined && containsPath(real, probe.entry)
        ? path
        : undefined;
    }
    const target = probe.readLink(path);
    if (target === undefined) return undefined;
    path = resolve(dirname(path), target);
  }
  return undefined;
}

const unknownInstall = (runtime: "node" | "bun"): UnknownInstall => ({
  kind: "unknown",
  runtime,
  label: installSourceLabel("unknown", runtime),
});

/**
 * Classify an install from a captured probe — the PURE core of
 * {@link detectInstallSource}, exercised by the fixture matrix in its test.
 *
 * @param probe - The captured paths, environment, and filesystem readers.
 * @returns The classified install source.
 */
export function classifyInstall(probe: InstallProbe): InstallSource {
  const invokedEntry = resolveInvokedEntry(probe);
  const installed =
    invokedEntry ??
    (locatePackage(probe.entry) !== undefined ? probe.entry : undefined);
  if (installed === undefined) return unknownInstall(probe.runtime);
  const located = locatePackage(installed);
  /* v8 ignore next -- `installed` is only set when locatePackage succeeded */
  if (located === undefined) return unknownInstall(probe.runtime);
  const { root, pkgDir } = located;

  // A package dir that is a symlink pointing OUTSIDE its install root is a
  // linked development install (`npm link`/`bun link`). Inside the root it is
  // a store or workspace layout (pnpm's `.pnpm`, a monorepo package) — normal.
  const rawTarget = probe.readLink(pkgDir);
  if (rawTarget !== undefined) {
    const target = resolve(dirname(pkgDir), rawTarget);
    if (!containsPath(root, target)) {
      const pm = managerFromPath(installed);
      return {
        kind: "linked",
        ...(pm !== undefined ? { pm } : {}),
        target,
        label: installSourceLabel("linked", pm),
      };
    }
  }

  const runner = ephemeralRunner(installed);
  if (runner !== undefined) {
    return {
      kind: "ephemeral",
      runner,
      label: installSourceLabel("ephemeral", runner),
    };
  }

  const shaped = managerFromPath(installed);
  if (containsPath(root, resolve(probe.cwd))) {
    // A workspace tree can belong to any manager; the lockfile beside its
    // root is the marker, the user-agent (when a script runner set it) the
    // corroboration of last resort.
    const pm =
      shaped ??
      lockfileManager(root, probe.exists, sepOf(installed)) ??
      agentManager(probe.userAgent);
    return {
      kind: "workspace",
      ...(pm !== undefined ? { pm } : {}),
      root,
      label: installSourceLabel("workspace", pm),
    };
  }

  // A global tree with none of the distinctive shapes is npm's: bun, pnpm,
  // volta and yarn all mark their global roots, npm (and nvm/asdf node
  // installs, which npm serves) do not. The user-agent is NOT consulted here —
  // it names whoever ran the script (`bun run …`), not who installed the bin.
  const pm = shaped ?? "npm";
  return { kind: "global", pm, label: installSourceLabel("global", pm) };
}

/** Capture the live process into a probe (the only impure code here). */
function liveProbe(): InstallProbe {
  return {
    entry: fileURLToPath(import.meta.url),
    invoked: process.argv[1],
    cwd: process.cwd(),
    userAgent: process.env.npm_config_user_agent,
    runtime: process.versions.bun ? "bun" : "node",
    readLink: (path) => {
      try {
        return readlinkSync(path);
      } catch {
        return undefined;
      }
    },
    realPath: (path) => {
      try {
        return realpathSync(path);
      } catch {
        return undefined;
      }
    },
    exists: (path) => existsSync(path),
  };
}

/**
 * Detect how the binary was installed.
 *
 * @param probe - Injected probe (tests); defaults to the live process.
 * @returns The classified install source.
 * @note Impure by default — reads `import.meta.url`, `process`, and a bounded
 *   handful of symlink/realpath/exists probes. Never writes.
 */
export function detectInstallSource(
  probe: InstallProbe = liveProbe(),
): InstallSource {
  return classifyInstall(probe);
}

/** The global-update command per package manager (install-style). */
const PM_UPDATE_COMMAND: Record<PackageManager, (pkg: string) => string> = {
  bun: (pkg) => `bun add -g ${pkg}`,
  npm: (pkg) => `npm i -g ${pkg}`,
  pnpm: (pkg) => `pnpm add -g ${pkg}`,
  yarn: (pkg) => `yarn global add ${pkg}`,
  volta: (pkg) => `volta install ${pkg}`,
};

/**
 * The command that updates a GLOBAL install of `pkg`. Accepting only the
 * {@link GlobalInstall} arm is the point: a linked, ephemeral, workspace, or
 * unknown install has no sanctioned command, and asking for one is a type
 * error — {@link updateGuidance} is what those states say instead.
 *
 * @param install - The detected global install.
 * @param pkg - The package to update.
 * @returns The shell command.
 */
export function pmUpdateCommand(install: GlobalInstall, pkg: string): string {
  return PM_UPDATE_COMMAND[install.pm](pkg);
}

/**
 * The honest sentence a command-less install state shows when a newer release
 * exists — see {@link INSTALL_UPDATE_GUIDANCE} for the words.
 *
 * @param install - Any non-global install.
 * @returns The guidance sentence for its state.
 */
export function updateGuidance(
  install: Exclude<InstallSource, GlobalInstall>,
): string {
  return INSTALL_UPDATE_GUIDANCE[install.kind];
}
