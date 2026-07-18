/**
 * `setup completions` — install the static shell-completion script.
 *
 * Detection (the shell) is a REAL read done in the async-setup phase, so a
 * `--dry-run` preview is ACCURATE (the write effect is what the dry-run
 * interpreter mocks, not the detection). The script body is the grammar-driven
 * `emitScripts(capabilities)` output — exactly the static tier the covenant
 * names ("shell script tier emitted by `setup completions`") — with the
 * `completion` config (minChars, per-family opt-out) baked in at emit time.
 */

import { dirname } from "node:path";
import {
  $,
  deleteFile,
  gen,
  info,
  mkdir,
  type Task,
  warn,
  writeFile,
} from "@canonical/task";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import { applyPromptStrategy } from "../promptStrategy.js";
import { completionScriptPath, detectShell } from "../shell.js";
import type { SetupResult } from "../types.js";

/**
 * Build the `setup completions` Task.
 *
 * @param rt - The per-invocation runtime.
 * @returns A Task that writes the completion script (or warns if no shell).
 * @note Impure — detects the shell and composes a file write.
 */
export async function setupCompletions(
  rt: PragmaRuntime,
): Promise<Task<SetupResult>> {
  applyPromptStrategy(rt);
  const shell = detectShell();
  if (!shell) {
    return gen(function* () {
      yield* $(
        warn("Could not detect your shell — set $SHELL to zsh, bash, or fish."),
      );
      return {
        kind: "completions" as const,
        shell: null,
        path: null,
        installed: false,
      };
    });
  }

  const [{ capabilities }, { emitScripts }, { readConfig }] = await Promise.all(
    [
      import("../../index.js"),
      import("../../../kernel/completion/emitScripts.js"),
      import("../../../kernel/config/readConfig.js"),
    ],
  );
  const { config } = await readConfig(rt.cwd);
  const completion = config.completion;
  const disabledFamilies = completion?.families
    ? Object.entries(completion.families)
        .filter(([, enabled]) => enabled === false)
        .map(([family]) => family)
    : undefined;
  const script = emitScripts(capabilities, {
    ...(completion?.minChars !== undefined
      ? { minChars: completion.minChars }
      : {}),
    ...(disabledFamilies && disabledFamilies.length > 0
      ? { disabledFamilies }
      : {}),
  })[shell];
  const path = completionScriptPath(shell);

  return gen(function* () {
    yield* $(info(`Installing ${shell} completions to ${path}...`));
    yield* $(mkdir(dirname(path), true));
    yield* $(writeFile(path, script, { undo: deleteFile(path) }));
    return {
      kind: "completions" as const,
      shell,
      path,
      installed: true,
    };
  });
}
