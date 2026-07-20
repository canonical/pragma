/**
 * Shell detection + completion-script install paths (ported from the old
 * shell's `setup/helpers/detectShell` + `completionScripts` path helpers).
 *
 * The covenant `setup completions` sub-verb carries NO flags, so shell selection
 * is detection-only (the old `--zsh`/`--bash`/`--fish` force-flags are dropped).
 * `$HOME` is read at call time so tests can isolate it.
 */

import { homedir } from "node:os";
import { join } from "node:path";

/** The shells `setup completions` can install for. */
export type ShellId = "zsh" | "bash" | "fish";

const SHELL_MAP: Record<string, ShellId> = {
  zsh: "zsh",
  bash: "bash",
  fish: "fish",
};

/**
 * Detect the user's shell from `$SHELL`.
 *
 * @returns The detected shell, or `null` when `$SHELL` is unset/unrecognized.
 * @note Impure — reads `process.env.SHELL`.
 */
export function detectShell(): ShellId | null {
  const shell = process.env.SHELL ?? "";
  const basename = shell.split("/").pop() ?? "";
  return SHELL_MAP[basename] ?? null;
}

/**
 * The standard install path for a shell's completion script.
 *
 * @param shell - The target shell.
 * @returns The absolute path the completion script is written to.
 * @note Impure — reads the home directory.
 */
export function completionScriptPath(shell: ShellId): string {
  const home = homedir();
  switch (shell) {
    case "zsh":
      return join(home, ".zfunc", "_pragma");
    case "bash":
      return join(
        home,
        ".local",
        "share",
        "bash-completion",
        "completions",
        "pragma",
      );
    case "fish":
      return join(home, ".config", "fish", "completions", "pragma.fish");
  }
}

/**
 * The post-install activation hint for a shell.
 *
 * bash and fish install into directories their completion systems auto-load, so
 * the only step left is a fresh shell. zsh's `~/.zfunc` is NOT auto-loaded: the
 * script never loads unless `~/.zfunc` is on `$fpath` BEFORE `compinit` runs —
 * the single trap every zsh user hits, so we spell out the exact `.zshrc` lines.
 *
 * @param shell - The shell the script was installed for.
 * @returns A one-or-more-line activation instruction.
 */
export function activationHint(shell: ShellId): string {
  switch (shell) {
    case "zsh":
      return (
        "To activate, ensure ~/.zfunc is on your fpath BEFORE compinit. Add to ~/.zshrc:\n" +
        "    fpath=(~/.zfunc $fpath)\n" +
        "    autoload -Uz compinit && compinit\n" +
        "Then restart your shell (or run `exec zsh`)."
      );
    case "bash":
      return "To activate, restart your shell (bash-completion auto-loads the script).";
    case "fish":
      return "To activate, restart your shell (fish auto-loads the script).";
  }
}
