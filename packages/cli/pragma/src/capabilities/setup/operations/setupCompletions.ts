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
  info,
  mkdir,
  sequence_,
  type Task,
  warn,
  writeFile,
} from "@canonical/task";
import {
  activationHint,
  completionScriptPath,
  detectShell,
  type ShellId,
} from "../shell.js";
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
 * The prior `state` drives the MESSAGE only ("already up to date" / "Updating" /
 * "Installing"), NOT whether the write happens: the (idempotent) write is always
 * composed so it carries its `undo` — `--undo` reverses the SAME task and must
 * find the reversible effect, and `execute` interprets the task twice. A
 * byte-identical rewrite in the `installed` case is harmless.
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
  const { path, script, shell, state } = d;
  const opening =
    state === "installed"
      ? `${shell} completions already up to date at ${path}.`
      : `${state === "stale" ? "Updating" : "Installing"} ${shell} completions to ${path}...`;
  return sequence_([
    info(opening),
    mkdir(dirname(path), true),
    writeFile(path, script, { undo: deleteFile(path) }),
    info(activationHint(shell)),
  ]);
}
