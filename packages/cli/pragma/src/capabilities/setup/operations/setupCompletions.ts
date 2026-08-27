/**
 * `setup completions` — install the static shell-completion script.
 *
 * Split into a `detect` phase (a REAL read of the shell, the `completion` config,
 * and the grammar-driven `emitScripts(capabilities)` body — with the config's
 * `minChars` gate and per-family opt-out baked in at emit time — done up front so
 * the wizard's recap/preview and a `--dry-run` are accurate) and a pure `compose`
 * phase (the file write the dry-run interpreter mocks). The script body is the
 * static tier the covenant names ("shell script tier emitted by
 * `setup completions`").
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  deleteFile,
  mkdir,
  sequence_,
  type Task,
  writeFile,
} from "@canonical/task";
import { completionScriptPath, detectShell, type ShellId } from "../shell.js";
import type { CompletionsState } from "../types.js";

/**
 * The detected completion install target: the shell, the absolute script path,
 * the emitted script body — all `null` when no shell could be detected — and the
 * prior on-disk {@link CompletionsState} (whether an up-to-date/stale script is
 * already installed), read up front so the recap and a `--dry-run` are accurate
 * and an identical rewrite is skipped.
 */
export interface CompletionsDetection {
  readonly shell: ShellId | null;
  readonly path: string | null;
  readonly script: string | null;
  readonly state: CompletionsState;
}

/**
 * Classify the completion script already at `path` against the body we would
 * write: `installed` when byte-identical (a re-run skips it), `stale` when a
 * different script is present, `absent` when no file exists.
 *
 * @param path - The install path.
 * @param script - The body a write would emit.
 * @returns The prior {@link CompletionsState}.
 * @note Impure — reads the install path.
 */
function classifyCompletions(path: string, script: string): CompletionsState {
  if (!existsSync(path)) return "absent";
  try {
    return readFileSync(path, "utf8") === script ? "installed" : "stale";
  } catch {
    return "stale";
  }
}

/**
 * Detect the shell and pre-render its completion script, baking in the
 * `completion` config (read from `cwd`): `minChars` gates the `__complete` exec
 * in the emitted scripts, and a family mapped to `false` drops its name
 * completion. Read here at emit time — never on the storeless `__complete` fast
 * path.
 *
 * @param cwd - Directory the `completion` config layers are resolved from.
 * @returns The install target, or an all-`null` shape when `$SHELL` is unset.
 * @note Impure — reads `$SHELL`, the capability registry, and the config layers.
 */
export async function detectCompletions(
  cwd: string,
): Promise<CompletionsDetection> {
  const shell = detectShell();
  if (!shell) return { shell: null, path: null, script: null, state: "absent" };

  const [{ capabilities }, { emitScripts }, { readConfig }] = await Promise.all(
    [
      import("../../index.js"),
      import("../../../kernel/completion/emitScripts.js"),
      import("../../../kernel/config/readConfig.js"),
    ],
  );
  const { config } = await readConfig(cwd);
  const completion = config.completion;
  const disabledFamilies = completion?.families
    ? Object.entries(completion.families)
        .filter(([, enabled]) => enabled === false)
        .map(([family]) => family)
    : undefined;
  const path = completionScriptPath(shell);
  const script = emitScripts(capabilities, {
    ...(completion?.minChars !== undefined
      ? { minChars: completion.minChars }
      : {}),
    ...(disabledFamilies && disabledFamilies.length > 0
      ? { disabledFamilies }
      : {}),
  })[shell];
  return { shell, path, script, state: classifyCompletions(path, script) };
}

/**
 * Compose the completion-script write from a detection.
 *
 * Built from re-runnable combinators (NOT a single-use `gen`): `execute`
 * interprets a generator's task TWICE — once for the confirm-gate preview and
 * once to perform it — so the composed task must survive a second drive.
 *
 * An `installed` (byte-identical) script composes NOTHING. The write used to
 * happen anyway so that `--undo` had a reversible effect to find; removal is
 * now composed from detection instead ({@link composeCompletionsRemoval}), so
 * the forward path is free to be quiet: a converged re-run leaves the file's
 * mtime alone.
 *
 * The task carries no log effects. What a run says about this target is the
 * plan row's business — one structure, rendered the same way in the preview,
 * the progress line and the recap.
 *
 * @param d - The detection gathered up front.
 * @returns A Task that installs the script, or an empty Task when it is current.
 */
export function composeCompletions(d: CompletionsDetection): Task<void> {
  if (d.shell === null || d.path === null || d.script === null) {
    return sequence_([]);
  }
  if (d.state === "installed") return sequence_([]);
  return sequence_([
    mkdir(dirname(d.path), true),
    writeFile(d.path, d.script, { undo: deleteFile(d.path) }),
  ]);
}

/**
 * Compose the removal of an installed script: the forward effect re-asserts the
 * script (idempotent) and carries its deletion as `undo`, which is what the undo
 * interpreter executes. An absent script composes nothing, so `--undo` on a
 * machine that never installed one reverses zero steps and says so.
 *
 * @param d - The detection gathered up front.
 * @returns A Task whose undo deletes the installed script.
 */
export function composeCompletionsRemoval(d: CompletionsDetection): Task<void> {
  if (d.path === null || d.script === null || d.state === "absent") {
    return sequence_([]);
  }
  return sequence_([writeFile(d.path, d.script, { undo: deleteFile(d.path) })]);
}
