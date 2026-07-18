/**
 * The project lock — `pragma.lock.json`, committed at the project root.
 *
 * It pins the single combined pack the store boots from: `contentHash` names
 * the pack's cache directory, and `packs[]` records the resolved provenance of
 * every configured source (so `sources status` reports it and a `--frozen`
 * update re-resolves to exactly these commits). Serialization is canonical —
 * fixed field order, packs sorted by name, one trailing newline — so a
 * `--frozen` update that changes nothing rewrites a byte-identical file.
 *
 * Pure: zod + fs only, no store code, so both the storeless `sources status`
 * verb and the store-boot decision table read it without booting oxigraph.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { lockPath } from "./paths.js";

/** One resolved source's provenance in the lock. */
export const lockPackageSchema = z.object({
  /** Package name (config `packages` entry name / npm name). */
  name: z.string(),
  /** The config `packages` source ref, verbatim (e.g. `git+https://…#main`). */
  source: z.string(),
  /** The resolved commit / version / absolute path this ref pinned to. */
  resolved: z.string(),
  /** ISO timestamp the ref was resolved. */
  resolvedAt: z.string(),
});

/** The lock document. */
export const pragmaLockSchema = z.object({
  version: z.literal(1),
  /** The combined pack's content hash — names its cache directory. */
  contentHash: z.string(),
  packs: z.array(lockPackageSchema),
});

/** One resolved source's provenance in the lock. */
export type PragmaLockPackage = z.infer<typeof lockPackageSchema>;
/** The parsed lock document. */
export type PragmaLock = z.infer<typeof pragmaLockSchema>;

/**
 * Read and validate the lock for a working directory.
 *
 * @param cwd - The project directory.
 * @returns The parsed lock, or `undefined` when absent or invalid.
 * @note Impure — reads from disk.
 */
export function readLock(cwd: string): PragmaLock | undefined {
  const path = lockPath(cwd);
  if (!existsSync(path)) return undefined;
  try {
    return pragmaLockSchema.parse(JSON.parse(readFileSync(path, "utf-8")));
  } catch {
    return undefined;
  }
}

/** Serialize a lock canonically — stable field order, sorted packs, newline. */
export function serializeLock(lock: PragmaLock): string {
  const packs = [...lock.packs]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map((pack) => ({
      name: pack.name,
      source: pack.source,
      resolved: pack.resolved,
      resolvedAt: pack.resolvedAt,
    }));
  return `${JSON.stringify(
    { version: lock.version, contentHash: lock.contentHash, packs },
    null,
    2,
  )}\n`;
}

/**
 * Write the lock for a working directory.
 *
 * @param cwd - The project directory.
 * @param lock - The lock to persist.
 * @returns The exact bytes written (for the write effect / assertions).
 * @note Impure — writes `pragma.lock.json`.
 */
export function writeLock(cwd: string, lock: PragmaLock): string {
  const content = serializeLock(lock);
  writeFileSync(lockPath(cwd), content);
  return content;
}
