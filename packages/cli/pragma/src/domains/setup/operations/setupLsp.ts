import { $, exec, gen, info, type Task } from "@canonical/task";

/**
 * Compose a Task that installs the Terrazzo LSP VS Code extension
 * by running `bunx @canonical/terrazzo-lsp-extension`.
 *
 * @param root - Project root directory (used as cwd for the subprocess).
 * @returns A Task that yields void on completion.
 * @note Impure
 */
export default function setupLsp(root: string): Task<void> {
  return gen(function* () {
    yield* $(info("Installing Terrazzo LSP extension for VS Code..."));
    yield* $(exec("bunx", ["@canonical/terrazzo-lsp-extension"], root));
    yield* $(info("✓ Terrazzo LSP extension installed."));
  });
}
