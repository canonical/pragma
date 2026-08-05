/**
 * Shell detection + completion-script install paths (ported from the old
 * shell's `setup/helpers/detectShell` + `completionScripts` path helpers).
 *
 * The covenant `setup completions` sub-verb carries NO flags, so shell selection
 * is detection-only: there is no flag to force a shell.
 * `$HOME` is read at call time so tests can isolate it.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { BIN_NAME } from "../../constants.js";

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
 * The BASENAME is {@link BIN_NAME}, never a literal, because `emitScripts`
 * derives the script's own `#compdef` / `complete -F` / `complete -c` from that
 * same name, and for two of the three shells the basename decides whether the
 * file is ever loaded. Measured against real shells with the distribution
 * renamed to `widget9`:
 *
 * - **fish** autoloads `completions/<cmd>.fish` BY NAME. A correct `widget9`
 *   script in a file called `pragma.fish` is never loaded — TAB silently falls
 *   back to filenames. Verified: renaming that one file is the entire
 *   difference between candidates and no candidates.
 * - **bash-completion** looks up `completions/<cmd>` by the command name the
 *   same way. Verified against bash-completion 2.11's `__load_completion`:
 *   with the file named `widget9`, `complete -p widget9` reports
 *   `complete -F _widget9 widget9`; with the identical file named `pragma`,
 *   `_widget9` is never defined and bash falls back to `_minimal`.
 * - **zsh** does NOT work that way: `compinit` binds by the `#compdef` tag
 *   inside the file, so `~/.zfunc/_pragma` holding `#compdef widget9` does
 *   complete `widget9` (verified — `_comps[widget9]` resolves to `_pragma`).
 *   The basename still matters, for a different reason: it names the function
 *   zsh autoloads, and two distributions both writing `_pragma` would silently
 *   overwrite each other's completions.
 *
 * Either way `setup completions` and `doctor` report success, so nothing else
 * would tell the user.
 *
 * @param shell - The target shell.
 * @returns The absolute path the completion script is written to.
 * @note Impure — reads the home directory.
 */
export function completionScriptPath(shell: ShellId): string {
  const home = homedir();
  switch (shell) {
    case "zsh":
      return join(home, ".zfunc", `_${BIN_NAME}`);
    case "bash":
      return join(
        home,
        ".local",
        "share",
        "bash-completion",
        "completions",
        BIN_NAME,
      );
    case "fish":
      return join(home, ".config", "fish", "completions", `${BIN_NAME}.fish`);
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
