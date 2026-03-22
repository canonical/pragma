import { $, gen, info, promptConfirm, type Task, when } from "@canonical/task";
import setupCompletions from "./setupCompletions.js";
import setupLsp from "./setupLsp.js";
import setupMcp from "./setupMcp.js";

/**
 * Compose a Task that runs completions, LSP, and MCP setup in sequence,
 * each guarded by a promptConfirm gate.
 *
 * @param root - Project root directory.
 * @returns A Task that yields void on completion.
 * @note Impure
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
