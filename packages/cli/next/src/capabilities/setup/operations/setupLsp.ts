/**
 * `setup lsp` — ensure the Terrazzo LSP VS Code extension is installed.
 *
 * A single `exec` effect (the sole mutation) — mocked under `--dry-run`, run for
 * real otherwise. The extension installer is idempotent, so a successful run
 * reports it installed (up to date), not a fresh install.
 */

import { $, exec, gen, info, type Task } from "@canonical/task";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import { assertExecOk } from "../../shared/assertExecOk.js";
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
    const result = yield* $(
      exec("bunx", ["@canonical/terrazzo-lsp-extension"], cwd),
    );
    // The interpreter RESOLVES on a nonzero exit — a failed installer must fail
    // loudly (surfacing its stderr), not report a false success.
    assertExecOk("bunx @canonical/terrazzo-lsp-extension", result);
    return { kind: "lsp" as const };
  });
}
