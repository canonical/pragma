/**
 * `setup lsp` — ensure the Terrazzo LSP VS Code extension is installed.
 *
 * There is nothing to detect (the installer is a single idempotent `exec`), so
 * `detectLsp` is a trivial marker and `composeLsp` holds the sole mutation —
 * mocked under `--dry-run`, run for real otherwise. A successful run reports it
 * installed (up to date), not a fresh install.
 */

import {
  type ExecResult,
  exec,
  flatMap,
  info,
  pure,
  sequence_,
  type Task,
} from "@canonical/task";
import { assertExecOk } from "../../shared/assertExecOk.js";

/** LSP has no real detection — the install is one idempotent subprocess. */
export interface LspDetection {
  readonly available: true;
}

/**
 * "Detect" the LSP step. Always available — kept for symmetry with the other
 * steps' detect phase (so the run-all can gather every step uniformly).
 */
export function detectLsp(): LspDetection {
  return { available: true };
}

/**
 * Compose the LSP-install exec.
 *
 * Built from re-runnable combinators (NOT a single-use `gen`) because `execute`
 * interprets the task twice (preview + perform). Under the dry-run preview the
 * `exec` is MOCKED to `exitCode 0`, so `assertExecOk` passes there; a real run's
 * nonzero exit still fails loudly.
 *
 * @param cwd - The directory to run the installer in.
 * @returns A Task that execs the extension installer, failing loudly on nonzero.
 */
export function composeLsp(cwd: string): Task<void> {
  return sequence_([
    info("Ensuring the Terrazzo LSP VS Code extension is installed..."),
    // The interpreter RESOLVES on a nonzero exit — a failed installer must fail
    // loudly (surfacing its stderr), not report a false success.
    flatMap(
      exec("bunx", ["@canonical/terrazzo-lsp-extension"], cwd),
      (result) => {
        assertExecOk(
          "bunx @canonical/terrazzo-lsp-extension",
          result as ExecResult,
        );
        return pure(undefined);
      },
    ),
  ]);
}
