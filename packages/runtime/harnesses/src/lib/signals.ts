/**
 * Signal checking + confidence scoring for harness detection. Each
 * {@link DetectionSignal} arm resolves to a `Task<boolean>` over
 * `@canonical/task` effects (so detection stays dry-runnable), and the matched
 * signals score into a confidence tier. Split out of `detectHarnesses` so the
 * per-arm probes (a process on `PATH`, an editor extension, an env var) and the
 * tier table are unit-tested against injected platform fixtures at 100%
 * coverage, independent of the harness registry.
 */

import { join } from "node:path";
import {
  exec,
  exists,
  flatMap,
  glob,
  map,
  pure,
  recover,
  type Task,
  traverse,
} from "@canonical/task";
import { type PlatformEnv, userHome } from "./platformPaths.js";
import type { DetectionSignal } from "./types.js";

/** The context threaded through every signal check: the project root + host. */
export interface DetectContext {
  readonly projectRoot: string;
  readonly platform: PlatformEnv;
}

/** A detection confidence tier. */
export type Confidence = "high" | "medium" | "low";

/** Ordering weight for a tier — lower is stronger (high wins). */
export const CONFIDENCE_RANK: Record<Confidence, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Resolve a directory/file signal path: a `~/…` path against the platform home,
 * anything else against the project root.
 */
const resolveFsPath = (path: string, ctx: DetectContext): string =>
  path.startsWith("~/")
    ? join(userHome(ctx.platform), path.slice(2))
    : join(ctx.projectRoot, path);

/**
 * The executable suffixes probed on win32 when `PATHEXT` is unset — the usual
 * Windows default. Crucially includes `.CMD`/`.BAT`: npm installs CLI harnesses
 * (`claude`, `codex`, `od`…) as `.cmd` shims, never `.exe`, so an `.exe`-only
 * probe would miss every npm-installed harness on Windows.
 */
const DEFAULT_PATHEXT = ".COM;.EXE;.BAT;.CMD";

/**
 * Check a `process` signal: whether `name` resolves on the platform `PATH` (on
 * win32, under any `PATHEXT` suffix — not just `.exe`) and, when a `verify` is
 * given, whether running it produces stdout matching `verify.match`.
 *
 * The `verify` SPAWNS the binary, so its exec is wrapped in {@link recover}: a
 * spawn failure (ENOENT/EACCES, or the process itself erroring) resolves to an
 * unverified `false` rather than rejecting — one harness's probe must never be
 * able to reject all of `detectHarnesses` and crash `setup`/`doctor`.
 */
const checkProcess = (
  signal: Extract<DetectionSignal, { type: "process" }>,
  ctx: DetectContext,
): Task<boolean> => {
  const isWindows = ctx.platform.platform === "win32";
  const separator = isWindows ? ";" : ":";
  // On win32 an executable matches under any PATHEXT suffix; elsewhere the bare
  // name is the sole candidate (the empty suffix).
  const suffixes = isWindows
    ? (ctx.platform.env.PATHEXT ?? DEFAULT_PATHEXT)
        .split(";")
        .filter((suffix) => suffix.length > 0)
    : [""];
  const candidates = (ctx.platform.env.PATH ?? "")
    .split(separator)
    .filter((dir) => dir.length > 0)
    .flatMap((dir) =>
      suffixes.map((suffix) => join(dir, `${signal.name}${suffix}`)),
    );

  return flatMap(
    traverse(candidates, (candidate) => exists(candidate)),
    (results) => {
      if (!results.some(Boolean)) return pure(false);
      const verify = signal.verify;
      if (!verify) return pure(true);
      return recover(
        map(exec(signal.name, [...verify.args]), (result) =>
          verify.match.test(result.stdout),
        ),
        () => pure(false),
      );
    },
  );
};

/**
 * The VS Code-family extension roots probed for an `extension` signal, relative
 * to home. VS Code and its forks each keep their own extensions directory in the
 * identical `<id>-<version>` layout, so an extension installed under ANY of them
 * counts: stock VS Code (`~/.vscode`), Cursor (`~/.cursor`), VSCodium
 * (`~/.vscode-oss`), and Windsurf (`~/.windsurf`).
 */
const VSCODE_FAMILY_EXTENSION_ROOTS = [
  ".vscode",
  ".cursor",
  ".vscode-oss",
  ".windsurf",
] as const;

/**
 * Check an `extension` signal: whether any installed VS Code-family extension
 * directory matches `<id>-<version>`. VS Code and its forks (Cursor, VSCodium,
 * Windsurf) keep extensions under the same `<root>/extensions` layout, so every
 * known family root ({@link VSCODE_FAMILY_EXTENSION_ROOTS}) is probed and ANY
 * match counts. Each directory is confirmed to exist before it is globbed, since
 * globbing a missing directory throws.
 */
const checkExtension = (
  signal: Extract<DetectionSignal, { type: "extension" }>,
  ctx: DetectContext,
): Task<boolean> => {
  const home = userHome(ctx.platform);
  const extensionDirs = VSCODE_FAMILY_EXTENSION_ROOTS.map((root) =>
    join(home, root, "extensions"),
  );
  return map(
    traverse(extensionDirs, (extensionsDir) =>
      flatMap(exists(extensionsDir), (dirExists) =>
        dirExists
          ? map(
              glob(`${signal.id}-*`, extensionsDir),
              (matches) => matches.length > 0,
            )
          : pure(false),
      ),
    ),
    (results) => results.some(Boolean),
  );
};

/** Check an `env` signal: the key is present (and equals `value` when given). */
const checkEnv = (
  signal: Extract<DetectionSignal, { type: "env" }>,
  ctx: DetectContext,
): Task<boolean> => {
  const actual = ctx.platform.env[signal.key];
  if (signal.value !== undefined) return pure(actual === signal.value);
  return pure(actual !== undefined);
};

/**
 * Resolve a single detection signal to a `Task<boolean>` — true when it matches.
 *
 * @param signal - The signal to check.
 * @param ctx - The project root + captured platform.
 * @returns A Task yielding whether the signal matches.
 * @note Impure for directory/file/extension/process signals — they probe the
 * filesystem / `PATH` / process table via Task effects; `env` is pure over the
 * captured platform environment.
 */
export const checkSignal = (
  signal: DetectionSignal,
  ctx: DetectContext,
): Task<boolean> => {
  switch (signal.type) {
    case "directory":
    case "file":
      return exists(resolveFsPath(signal.path, ctx));
    case "extension":
      return checkExtension(signal, ctx);
    case "process":
      return checkProcess(signal, ctx);
    case "env":
      return checkEnv(signal, ctx);
  }
};

/**
 * The confidence tier a signal type contributes when matched: a directory/file
 * is high (a config lives there), an extension/process is medium (the tool is
 * installed but the project may not use it), an env var is low.
 *
 * @param signal - The matched signal.
 * @returns Its confidence tier.
 */
export const toSignalTier = (signal: DetectionSignal): Confidence => {
  switch (signal.type) {
    case "directory":
    case "file":
      return "high";
    case "extension":
    case "process":
      return "medium";
    case "env":
      return "low";
  }
};

/**
 * Score signal check results into the strongest (MAX) confidence tier among the
 * matched signals, or null when none matched.
 *
 * @param results - Per-signal match booleans, index-aligned with `signals`.
 * @param signals - The signals that produced `results`.
 * @returns The strongest matched tier, or null when nothing matched.
 */
export const scoreConfidence = (
  results: readonly boolean[],
  signals: readonly DetectionSignal[],
): Confidence | null => {
  const matched = signals
    .filter((_signal, index) => results.at(index) === true)
    .map(toSignalTier);
  if (matched.length === 0) return null;
  return matched.reduce((best, tier) =>
    CONFIDENCE_RANK[tier] < CONFIDENCE_RANK[best] ? tier : best,
  );
};
