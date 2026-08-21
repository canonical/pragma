/**
 * The copy-analog that CARRIES its content: where a generator once did
 * `copyFile(src, dest)` (impossible in a compiled binary — the source file is
 * not on disk), it now loads the content through the embedded seam and writes
 * it VERBATIM. The `verbatim` marker keeps the stamping transform off the
 * bytes ({@link import("../../stamp/createStampOnEffectStart.js").default}
 * skips it), so a carried `.ts`/`.css` asset lands byte-identical to the old
 * copy — including relay `__generated__` artifacts a stamp would corrupt.
 *
 * The node interpreter creates the dest's parent directories, exactly as it
 * does for any write.
 */

import { type Task, writeFile } from "@canonical/task";

/** One carried file: where it came from, its bytes, and where it lands. */
export interface RawFileOptions {
  /** The original source path (provenance; the content already carries it). */
  readonly source: string;
  /** The file content, loaded through the embedded seam. */
  readonly content: string;
  /** Destination path. */
  readonly dest: string;
}

/**
 * Write a carried file verbatim (never stamped).
 *
 * @param options - Source id, content, and destination.
 * @returns The write task.
 */
export default function rawFile(options: RawFileOptions): Task<void> {
  return writeFile(options.dest, options.content, { verbatim: true });
}
