/**
 * The `create` overwrite guard — refuse to clobber existing files.
 *
 * `create` writes generated source; the summon generators emit `mkdir` +
 * `WriteFile` per file with NO existence check, and the task interpreter's
 * `WriteFile` is an unconditional `fs.writeFile`. So a `create component
 * src/Button --yes` (or MCP `create_component`) into a path a developer has
 * hand-edited SILENTLY overwrites every file with the bare template — data loss
 * the recap even reports as "Created …".
 *
 * This guard runs the built task through the pure `dryRun` interpreter (no
 * writes) to enumerate the FILE paths it would write, resolves them against the
 * run's write root, and reports which already exist. `runCreate` refuses the run
 * (a clean, actionable error) when any exist and `--force` was not passed. The
 * check is preview-only, so it never itself writes; the same task is then run
 * for real (or not) unchanged.
 */

import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { dryRun, type Effect, type Task } from "@canonical/task";
import { RECOVERY_CLI_PREFIX } from "../../constants.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";

/**
 * The write-effect tags whose target file the guard checks. `MakeDir` is
 * excluded — creating a directory that already exists is idempotent and never
 * destroys content; only a file WRITE can clobber a hand-edited file.
 */
const FILE_WRITE_TAGS = new Set<Effect["_tag"]>([
  "WriteFile",
  "AppendFile",
  "TransformFile",
]);

/** The file path a write-like effect targets, or null for a non-file effect. */
function writeTargetPath(effect: Effect): string | null {
  if (FILE_WRITE_TAGS.has(effect._tag)) {
    return (effect as Extract<Effect, { path: string }>).path;
  }
  if (effect._tag === "CopyFile") {
    return (effect as Extract<Effect, { _tag: "CopyFile" }>).dest;
  }
  return null;
}

/**
 * The already-existing files a generator task would write, resolved against the
 * run's write root. Empty when the run only creates new paths.
 *
 * @param task - The built generator task (interpreted here under `dryRun` only).
 * @param cwd - The write root relative effect paths resolve against (rt.cwd).
 * @returns The sorted, de-duplicated list of existing target files.
 * @note Impure — reads the filesystem (existence checks) via `existsSync`.
 */
export function existingTargets(task: Task<unknown>, cwd: string): string[] {
  const { effects } = dryRun(task);
  const existing = new Set<string>();
  for (const effect of effects) {
    const target = writeTargetPath(effect);
    if (target === null) continue;
    const absolute = isAbsolute(target) ? target : resolve(cwd, target);
    if (existsSync(absolute)) existing.add(absolute);
  }
  return [...existing].sort();
}

/**
 * Throw a clean, actionable error when a generator run would overwrite existing
 * files and `--force` was not passed. A no-op when the run only creates new
 * paths or `force` is true (the caller then proceeds to real execution).
 *
 * @param task - The built generator task.
 * @param cwd - The write root (rt.cwd).
 * @param force - Whether `--force` was passed (skips the guard).
 * @throws PragmaError INVALID_INPUT when existing files would be overwritten.
 * @note Impure — reads the filesystem to detect existing targets.
 */
export function assertNoOverwrite(
  task: Task<unknown>,
  cwd: string,
  force: boolean,
): void {
  if (force) return;
  const existing = existingTargets(task, cwd);
  if (existing.length === 0) return;
  const list = existing.map((file) => `  ${file}`).join("\n");
  // INVALID_INPUT (usage class, exit 2): the target path already exists, which
  // the user resolves — pick a new path or pass --force. NOT INTERNAL_ERROR
  // ("please report"), and not a silent overwrite.
  throw new PragmaError({
    code: "INVALID_INPUT",
    message: `Refusing to overwrite ${existing.length} existing file(s):\n${list}`,
    recovery: {
      message:
        "Pass --force to overwrite them, or choose a path that does not exist yet.",
      cli: `${RECOVERY_CLI_PREFIX}create … --force`,
    },
  });
}
