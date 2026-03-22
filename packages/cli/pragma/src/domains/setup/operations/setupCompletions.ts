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
 * Compose a Task that detects the user's shell and writes the
 * appropriate completion script to the standard install path.
 *
 * @param forceShell - If set, skip detection and use this shell.
 * @returns A Task that yields void on completion.
 * @note Impure
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
