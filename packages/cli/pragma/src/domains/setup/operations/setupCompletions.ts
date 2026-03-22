/**
 * `pragma setup completions` — install shell completion scripts.
 *
 * Detects the user's shell from $SHELL and writes the appropriate
 * completion script. Override with --zsh, --bash, or --fish.
 */

import { dirname } from "node:path";
import {
  $,
  exists,
  gen,
  info,
  mkdir,
  type Task,
  warn,
  writeFile,
} from "@canonical/task";
import {
  completionScriptContent,
  completionScriptPath,
  postInstallHint,
} from "../helpers/completionScripts.js";
import detectShell, { type ShellId } from "../helpers/detectShell.js";

/**
 * Compose a Task that installs shell completion scripts.
 *
 * @param forceShell - If set, skip detection and use this shell.
 */
export default function setupCompletions(forceShell?: ShellId): Task<void> {
  return gen(function* () {
    const shell = forceShell ?? detectShell();

    if (!shell) {
      yield* $(
        warn("Shell not detected. Use --zsh, --bash, or --fish to specify."),
      );
      return;
    }

    yield* $(info(`Setting up completions for ${shell}...`));

    const path = completionScriptPath(shell);
    const dir = dirname(path);

    const dirExists = yield* $(exists(dir));
    if (!dirExists) {
      yield* $(mkdir(dir, true));
    }

    const script = completionScriptContent(shell);
    yield* $(writeFile(path, script));

    yield* $(info(`✓ Completions installed for ${shell}.`));
    yield* $(info(`  ${postInstallHint(shell)}`));
  });
}
