/**
 * Chunked stdout writer.
 *
 * Bun's runtime can segfault when a single very large string is written to
 * stdout in one call; writing in ≤4 KiB pieces avoids it. Every command's final
 * output goes through {@link writeStdout} so large list/graph payloads stay safe.
 * Ported from the v1 `writeChunked` guard.
 *
 * The text is encoded to a UTF-8 `Buffer` first and sliced on byte boundaries.
 * Slicing the *string* by UTF-16 unit could split an astral character's
 * surrogate pair, leaving a lone surrogate that encodes to U+FFFD and corrupts
 * the output; splitting raw UTF-8 bytes across writes is lossless — the
 * consumer concatenates them.
 */

/** Maximum bytes written per `stream.write` call. */
const CHUNK_SIZE = 4096;

/**
 * Write a string to a writable stream in ≤{@link CHUNK_SIZE}-byte slices.
 *
 * @param stream - The destination writable stream.
 * @param text - The full string to write.
 * @note Impure — writes to the stream.
 */
export function writeChunked(
  stream: NodeJS.WritableStream,
  text: string,
): void {
  const buffer = Buffer.from(text, "utf8");
  if (buffer.length <= CHUNK_SIZE) {
    stream.write(buffer);
    return;
  }

  for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
    stream.write(buffer.subarray(offset, offset + CHUNK_SIZE));
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
