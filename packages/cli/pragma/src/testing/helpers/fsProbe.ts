/**
 * Filesystem fixtures for `probeWritable`'s seam — the two machines no CI host
 * is.
 *
 * `probeWritable` decides whether a row REPORTS a named skip or attempts a
 * write that fails with a raw fs message, and its two blocking answers cannot
 * be arranged for real here: no CI host has a `/nix/store`, and a test process
 * running as root can write to a `0o500` directory whatever its mode bits say.
 * So the filesystem is three injected functions.
 *
 * Two factories, because the suites want different things. {@link storeProbe}
 * keeps the REAL filesystem and rewrites one subtree's realpath into the
 * store, so an end-to-end case can build a genuine project and still be a Nix
 * machine for the one path that matters. {@link fakeFsProbe} invents the
 * filesystem outright and RECORDS every call, so a unit case can assert the
 * walk itself and not only its answer.
 */

import { accessSync, existsSync, realpathSync } from "node:fs";
import type { FsProbe } from "../../capabilities/setup/operations/writability.js";

/**
 * A probe over the real filesystem whose `realpathSync` maps everything under
 * `root` into `/nix/store/<hash>-…`.
 *
 * @param root - The subtree that resolves into the store.
 * @param hash - The store path's name, so two suites can tell theirs apart.
 * @returns The probe.
 * @note Impure — `existsSync`/`accessSync` are the real ones.
 */
export const storeProbe = (root: string, hash = "1a2b3c-vscode"): FsProbe => ({
  existsSync,
  accessSync,
  realpathSync: (path) =>
    path.startsWith(root)
      ? `/nix/store/${hash}${path.slice(root.length)}`
      : realpathSync(path),
});

/** What a {@link fakeFsProbe} filesystem consists of. */
export interface FakeFsSpec {
  /** The paths that exist. */
  readonly present?: readonly string[];
  /** Each path's realpath, for the ones that resolve elsewhere. */
  readonly realpath?: Readonly<Record<string, string>>;
  /** The RESOLVED paths that refuse `W_OK`. */
  readonly denied?: readonly string[];
  /** Whether `realpathSync` throws (a race, or a symlink loop). */
  readonly realpathThrows?: boolean;
}

/** A {@link fakeFsProbe}, plus the calls it saw. */
export type RecordingFsProbe = FsProbe & {
  /** Every path `existsSync` was asked about, in order — the walk. */
  readonly seen: string[];
  /** Every path `accessSync` was asked about, in order. */
  readonly accessed: string[];
};

/**
 * An invented filesystem that records what it was asked.
 *
 * @param spec - The filesystem to present.
 * @returns The probe, carrying `seen` and `accessed`.
 * @note Pure — it touches no real path; the arrays are its own state.
 */
export const fakeFsProbe = (spec: FakeFsSpec): RecordingFsProbe => {
  const seen: string[] = [];
  const accessed: string[] = [];
  return {
    seen,
    accessed,
    existsSync: (path) => {
      seen.push(path);
      return (spec.present ?? []).includes(path);
    },
    realpathSync: (path) => {
      if (spec.realpathThrows === true) throw new Error("ELOOP");
      return spec.realpath?.[path] ?? path;
    },
    accessSync: (path) => {
      accessed.push(path);
      if ((spec.denied ?? []).includes(path)) {
        throw new Error("EACCES: permission denied");
      }
    },
  };
};
