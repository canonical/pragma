/**
 * Shell detection from $SHELL environment variable.
 *
 * @note Impure — reads process.env.SHELL.
 */

export type ShellId = "zsh" | "bash" | "fish";

const SHELL_MAP: Record<string, ShellId> = {
  zsh: "zsh",
  bash: "bash",
  fish: "fish",
};

/**
 * Detect the user's shell from $SHELL.
 * Returns null if the shell is unknown or $SHELL is unset.
 */
export default function detectShell(): ShellId | null {
  const shell = process.env.SHELL ?? "";
  const basename = shell.split("/").pop() ?? "";
  return SHELL_MAP[basename] ?? null;
}
