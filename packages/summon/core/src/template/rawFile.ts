/**
 * The copy-analog that CARRIES its content: rather than `copyFile(src, dest)`,
 * a generator loads the bytes and writes them VERBATIM. The `verbatim` marker
 * keeps the stamping transform off them
 * ({@link import("../stamp/createStampOnEffectStart.js").default} skips it), so
 * a carried `.ts`/`.css` asset lands byte-identical — including relay
 * `__generated__` artifacts a stamp would corrupt.
 *
 * Carrying rather than copying also keeps the write on ONE effect seam, so a
 * `--dry-run` describes it and `--undo` reverses it like every other write.
 *
 * The node interpreter creates the dest's parent directories, exactly as it
 * does for any write.
 */

import { type Task, writeFile } from "@canonical/task";

/** One carried file: where it came from, its bytes, and where it lands. */
export interface RawFileOptions {
  /** The original source path (provenance; the content already carries it). */
  readonly source: string;
  /** The file content, already loaded by the caller. */
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
