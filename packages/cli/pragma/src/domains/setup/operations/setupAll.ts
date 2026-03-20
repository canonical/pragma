/**
 * `pragma setup all` — composed monad running all setup steps.
 *
 * Each step is guarded by a promptConfirm gate. Running with --yes
 * skips all prompts. The steps run in sequence so prompts appear
 * one at a time.
 *
 * @see SU.04 in B.15.SETUP
 */

import { $, gen, info, promptConfirm, type Task, when } from "@canonical/task";
import setupCompletions from "./setupCompletions.js";
import setupLsp from "./setupLsp.js";
import setupMcp from "./setupMcp.js";

/**
 * Compose a Task that runs all setup steps in sequence with
 * confirmation gates.
 *
 * @param root - Project root directory.
 */
export default function setupAll(root: string): Task<void> {
  return gen(function* () {
    yield* $(info("Setting up pragma for this project...\n"));

    // Step 1: Shell completions
    yield* $(info("1. Shell completions"));
    const doCompletions = yield* $(
      promptConfirm("setup-completions", "  Set up shell completions?", true),
    );
    yield* $(when(doCompletions, setupCompletions()));

    // Step 2: LSP
    yield* $(info("\n2. LSP"));
    const doLsp = yield* $(
      promptConfirm("setup-lsp", "  Install Terrazzo LSP extension?", true),
    );
    yield* $(when(doLsp, setupLsp(root)));

    // Step 3: MCP
    yield* $(info("\n3. MCP"));
    const doMcp = yield* $(
      promptConfirm("setup-mcp", "  Set up MCP for AI harnesses?", true),
    );
    yield* $(when(doMcp, setupMcp(root)));

    yield* $(info("\nSetup complete. Run `pragma doctor` to verify."));
  });
}
