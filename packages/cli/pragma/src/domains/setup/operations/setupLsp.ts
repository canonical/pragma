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
    yield* $(
      info("Ensuring the Terrazzo LSP VS Code extension is installed..."),
    );
    // The extension installer is idempotent — it installs if missing and is a
    // no-op if already present — so this reports "ensured", not a fresh install
    // (pragma does not inspect VS Code's extension state to tell them apart).
    yield* $(exec("bunx", ["@canonical/terrazzo-lsp-extension"], root));
    yield* $(info("✓ Terrazzo LSP extension is installed (up to date)."));
  });
}
