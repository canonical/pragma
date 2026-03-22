/** Union of supported shell identifiers. */
export type ShellId = "zsh" | "bash" | "fish";

const SHELL_MAP: Record<string, ShellId> = {
  zsh: "zsh",
  bash: "bash",
  fish: "fish",
};

/**
 * Detect the user's shell from the `$SHELL` environment variable.
 *
 * @returns The detected ShellId, or null if `$SHELL` is unset or unrecognized.
 * @note Impure
 */
export default function detectShell(): ShellId | null {
  const shell = process.env.SHELL ?? "";
  const basename = shell.split("/").pop() ?? "";
  return SHELL_MAP[basename] ?? null;
}
