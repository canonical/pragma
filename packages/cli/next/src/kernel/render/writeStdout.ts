/**
 * Chunked stdout writer.
 *
 * Bun's runtime can segfault when a single very large string is written to
 * stdout in one call; writing in ≤4 KiB slices avoids it. Every command's
 * final output goes through {@link writeStdout} so large list/graph payloads
 * stay safe. Ported from the v1 `writeChunked` guard.
 */

/** Maximum bytes written per `stream.write` call. */
const CHUNK_SIZE = 4096;

/**
 * Write a string to a writable stream in ≤{@link CHUNK_SIZE} slices.
 *
 * @param stream - The destination writable stream.
 * @param text - The full string to write.
 * @note Impure — writes to the stream.
 */
export function writeChunked(
  stream: NodeJS.WritableStream,
  text: string,
): void {
  if (text.length <= CHUNK_SIZE) {
    stream.write(text);
    return;
  }

  for (let offset = 0; offset < text.length; offset += CHUNK_SIZE) {
    stream.write(text.slice(offset, offset + CHUNK_SIZE));
  }
}

/**
 * Write a string to stdout, chunked, appending no newline.
 *
 * @param text - The string to write.
 * @note Impure — writes to `process.stdout`.
 */
export function writeStdout(text: string): void {
  writeChunked(process.stdout, text);
}
