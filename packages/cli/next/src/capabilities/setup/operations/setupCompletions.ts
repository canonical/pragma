/**
 * `setup completions` — install the static shell-completion script.
 *
 * Split into a `detect` phase (a REAL read of the shell + the grammar-driven
 * `emitScripts(capabilities)` body, done up front so the wizard's recap/preview
 * and a `--dry-run` are accurate) and a pure `compose` phase (the file write the
 * dry-run interpreter mocks). The script body is the static tier the covenant
 * names ("shell script tier emitted by `setup completions`").
 */

import { dirname } from "node:path";
import {
  deleteFile,
  info,
  mkdir,
  sequence_,
  type Task,
  warn,
  writeFile,
} from "@canonical/task";
import { completionScriptPath, detectShell, type ShellId } from "../shell.js";

/**
 * The detected completion install target: the shell, the absolute script path,
 * and the emitted script body — all `null` when no shell could be detected.
 */
export interface CompletionsDetection {
  readonly shell: ShellId | null;
  readonly path: string | null;
  readonly script: string | null;
}

/**
 * Detect the shell and pre-render its completion script.
 *
 * @returns The install target, or an all-`null` shape when `$SHELL` is unset.
 * @note Impure — reads `$SHELL` and the capability registry.
 */
export async function detectCompletions(): Promise<CompletionsDetection> {
  const shell = detectShell();
  if (!shell) return { shell: null, path: null, script: null };

  const [{ capabilities }, { emitScripts }] = await Promise.all([
    import("../../index.js"),
    import("../../../kernel/completion/emitScripts.js"),
  ]);
  return {
    shell,
    path: completionScriptPath(shell),
    script: emitScripts(capabilities)[shell],
  };
}

/**
 * Compose the completion-script write from a detection.
 *
 * Built from re-runnable combinators (NOT a single-use `gen`): `execute`
 * interprets a generator's task TWICE — once for the confirm-gate preview and
 * once to perform it — so the composed task must survive a second drive.
 *
 * @param d - The detection gathered up front.
 * @returns A Task that writes the script (with an undo), or warns if no shell.
 */
export function composeCompletions(d: CompletionsDetection): Task<void> {
  if (d.shell === null || d.path === null || d.script === null) {
    return warn(
      "Could not detect your shell — set $SHELL to zsh, bash, or fish.",
    );
  }
  const { path, script } = d;
  return sequence_([
    info(`Installing ${d.shell} completions to ${path}...`),
    mkdir(dirname(path), true),
    writeFile(path, script, { undo: deleteFile(path) }),
  ]);
}
