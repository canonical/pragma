/**
 * `setup lsp` — ensure the Terrazzo LSP VS Code extension is installed.
 *
 * `detectLsp` probes for the extension FOR REAL up front — it runs
 * `code --list-extensions` (via the `exec` seam, over `runTask`) and matches the
 * `terrazzo` extension id — so a re-run of an already-installed extension is a
 * true no-op and the recap says so, rather than always shelling out. When the
 * `code` CLI is absent from PATH the state is `unknown` (we cannot enumerate,
 * so the installer still runs). `composeLsp` holds the sole mutation, mocked
 * under `--dry-run` and skipped when detection already found the extension.
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
import type { LspState } from "../types.js";

/** The VS Code CLI queried for the installed-extensions list. */
const VSCODE_CLI = "code";

/** The substring an installed Terrazzo extension id contains (publisher-agnostic). */
const TERRAZZO_EXTENSION_MATCH = "terrazzo";

/**
 * The detected LSP state: whether the Terrazzo extension is already `installed`,
 * `absent`, or `unknown` (the `code` CLI is not on PATH, so we cannot enumerate).
 */
export interface LspDetection {
  readonly available: true;
  readonly state: LspState;
}

/**
 * Probe VS Code for the Terrazzo extension. Runs `code --list-extensions` and
 * matches the `terrazzo` id; an absent `code` CLI (spawn ENOENT) or a nonzero
 * exit yields `unknown` (we fall through to running the installer).
 *
 * @param cwd - The directory the probe runs in.
 * @returns The detected {@link LspState}.
 * @note Impure — spawns `code --list-extensions`.
 */
export async function detectLsp(cwd: string): Promise<LspDetection> {
  const { runTask } = await import("@canonical/task/node");
  let state: LspState = "unknown";
  try {
    const result = (await runTask(
      exec(VSCODE_CLI, ["--list-extensions"], cwd),
    )) as ExecResult;
    if (result.exitCode === 0) {
      const installed = result.stdout
        .toLowerCase()
        .includes(TERRAZZO_EXTENSION_MATCH);
      state = installed ? "installed" : "absent";
    }
  } catch {
    // `code` absent from PATH (ENOENT) or any spawn failure → we cannot tell;
    // leave `unknown` so the installer still runs.
    state = "unknown";
  }
  return { available: true, state };
}

/**
 * Compose the LSP-install exec.
 *
 * Built from re-runnable combinators (NOT a single-use `gen`) because `execute`
 * interprets the task twice (preview + perform). Under the dry-run preview the
 * `exec` is MOCKED to `exitCode 0`, so `assertExecOk` passes there; a real run's
 * nonzero exit still fails loudly. When detection already found the extension
 * `installed`, the install is SKIPPED — a re-run is a true no-op.
 *
 * @param cwd - The directory to run the installer in.
 * @param state - The prior state from {@link detectLsp} (defaults to `unknown`).
 * @returns A Task that execs the installer (or reports already-installed).
 */
export function composeLsp(
  cwd: string,
  state: LspState = "unknown",
): Task<void> {
  if (state === "installed") {
    return info("Terrazzo LSP VS Code extension already installed — skipped.");
  }
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
