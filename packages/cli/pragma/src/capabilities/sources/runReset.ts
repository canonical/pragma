/**
 * Build the `sources reset` Task — drop this project's built pack.
 *
 * The counterpart of `sources update`: update points the project at a pack it
 * built, reset takes the pointer away, so reads go back to what the config
 * resolves to on its own (the snapshot shipped with the CLI, or — for a project
 * that declares its own packs — nothing until it builds them again). It is the
 * verb a user needs after an upgrade passes over a pack an older CLI built and
 * they would rather remove it than rebuild it.
 *
 * THE POINTER, AND ONLY THE POINTER. The pack cache is content-addressed and
 * SHARED: another project on this machine may point at the same hash, and the
 * embedded snapshot is materialized into that same cache under its own hash, so
 * a per-project verb that deleted pack directories would be deleting bytes it
 * does not own. The pointer is the whole of a project's store state — one line
 * naming a hash — so removing it is exactly, and only, "this project no longer
 * reads a pack of its own". What stays behind is a cache doing its job: a later
 * `sources update` over the same sources finds the pack complete and reuses it
 * without a rebuild. (No `--all` for the same reason it has no flags at all:
 * evicting the shared cache, or the git-ref checkouts beside it, is a different
 * job from resetting one project, and this verb would be the wrong owner.)
 *
 * Nothing built is not a failure: the verb reports that it found nothing and
 * exits 0, the way `config unset` does for a field that was never set. There is
 * no state to correct — the project already reads what a reset would leave it
 * reading.
 */

import { $, deleteFile, gen, type Task } from "@canonical/task";
import type { PragmaRuntime } from "../../kernel/runtime/index.js";
import { activePackPath, readActivePack } from "../../kernel/runtime/paths.js";
import type { SourcesResetData } from "./types.js";

/**
 * Build the Task that removes the project's active-pack pointer.
 *
 * @param runtime - The per-invocation runtime.
 * @returns A Task yielding what was removed and what answers reads now.
 * @note Impure — reads config and the pointer; the Task deletes the pointer.
 */
export async function buildResetTask(
  runtime: PragmaRuntime,
): Promise<Task<SourcesResetData>> {
  const layers = await runtime.loadConfig();
  const priorHash = readActivePack(runtime.cwd);
  const path = activePackPath(runtime.cwd);
  const data: SourcesResetData = {
    removed: priorHash !== undefined,
    contentHash: priorHash ?? null,
    answers: layers.origins.packs === "default" ? "embedded" : "unavailable",
  };

  return gen(function* () {
    // No pointer, no effect: a Task with nothing in it is what "nothing to do"
    // looks like, and it keeps `--dry-run` honest (an empty plan, not a delete
    // of a file that is not there).
    if (priorHash !== undefined) {
      // No undo is declared: an undo re-plans from the disk, where the pointer
      // is already gone. The way back is `sources update`, which reuses the
      // cached pack.
      yield* $(deleteFile(path));
    }
    return data;
  });
}
