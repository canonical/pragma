/**
 * `setup lsp` — ensure the Terrazzo LSP VS Code extension is installed.
 *
 * A single `exec` effect (the sole mutation) — mocked under `--dry-run`, run for
 * real otherwise. The extension installer is idempotent, so this reports
 * "ensured", not a fresh install.
 */

import { $, exec, gen, info, type Task } from "@canonical/task";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import { applyPromptStrategy } from "../promptStrategy.js";
import type { SetupResult } from "../types.js";

/**
 * Build the `setup lsp` Task.
 *
 * @param rt - The per-invocation runtime.
 * @returns A Task that execs the extension installer.
 * @note Impure — composes a subprocess exec.
 */
export async function setupLsp(rt: PragmaRuntime): Promise<Task<SetupResult>> {
  applyPromptStrategy(rt);
  const cwd = rt.cwd;
  return gen(function* () {
    yield* $(
      info("Ensuring the Terrazzo LSP VS Code extension is installed..."),
    );
    yield* $(exec("bunx", ["@canonical/terrazzo-lsp-extension"], cwd));
    return { kind: "lsp" as const, ensured: true };
  });
}
