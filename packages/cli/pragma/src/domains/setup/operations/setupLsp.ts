/**
 * `pragma setup lsp` — install the Terrazzo LSP VS Code extension.
 *
 * Runs `npx @canonical/terrazzo-lsp-extension` which installs the
 * bundled VSIX into VS Code.
 *
 * @see SU.01 in B.15.SETUP
 */

import { $, exec, gen, info, type Task } from "@canonical/task";

/**
 * Compose a Task that installs the Terrazzo LSP VS Code extension
 * via its bundled install script.
 *
 * @param root - Project root directory (used as cwd for npx).
 */
export default function setupLsp(root: string): Task<void> {
  return gen(function* () {
    yield* $(info("Installing Terrazzo LSP extension for VS Code..."));
    yield* $(exec("npx", ["@canonical/terrazzo-lsp-extension"], root));
    yield* $(info("✓ Terrazzo LSP extension installed."));
  });
}
