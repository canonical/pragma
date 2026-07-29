/**
 * Doctor check: report how each configured semantic pack resolves.
 *
 * ADAPTED for v2: the old local>git>bundled loader chain is retired — resolution
 * now flows through `sources update` into `pragma.lock.json` + the cached pack.
 * This check reads the lock (which packs resolved) and the storeless pack
 * index (the entity total), never booting the store. An absent lock with
 * configured packs is the "run `sources update`" case.
 */

import {
  entityTotal,
  readPackIndex,
} from "../../../kernel/completion/entitySource.js";
import type { PackDeclaration } from "../../../kernel/config/types.js";
import { readLock } from "../../../kernel/runtime/lock.js";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import type { CheckItem, CheckResult } from "../types.js";

const entryName = (entry: PackDeclaration): string =>
  typeof entry === "string" ? entry : entry.name;

/**
 * Report pack resolution status against the lock and the entity total.
 *
 * @param rt - The per-invocation runtime.
 * @returns A CheckResult with a per-pack breakdown.
 * @note Impure — reads config, the lock, and the pack index from disk.
 */
export async function checkPackageRefs(
  rt: PragmaRuntime,
): Promise<CheckResult> {
  const entries = (await rt.loadConfig()).config.packs ?? [];
  const lock = readLock(rt.cwd);
  const index = readPackIndex(rt.cwd);
  const totalEntities = index ? entityTotal(index) : 0;

  if (entries.length === 0) {
    return {
      // The display says "packs" (config declarations); the file/function keep
      // "Package" (npm/git resolution vocabulary).
      name: "pack refs",
      status: "pass",
      detail: `no packs configured — the embedded pack answers reads (${totalEntities.toLocaleString()} entities)`,
    };
  }

  const items: CheckItem[] = [];
  let unresolved = 0;
  for (const entry of entries) {
    const name = entryName(entry);
    const packEntry = lock?.packs.find((pack) => pack.name === name);
    if (packEntry) {
      items.push({
        label: name,
        status: "pass",
        detail: `resolved ${packEntry.resolved}`,
      });
    } else {
      items.push({ label: name, status: "fail", detail: "not in the lock" });
      unresolved += 1;
    }
  }

  const ok = lock !== undefined && unresolved === 0;
  return {
    name: "pack refs",
    status: ok ? "pass" : "fail",
    detail: ok
      ? `${entries.length} pack(s) resolved · ${totalEntities.toLocaleString()} entities`
      : `${unresolved} of ${entries.length} pack(s) not resolved`,
    items,
    ...(ok ? {} : { remedy: "pragma sources update" }),
  };
}
