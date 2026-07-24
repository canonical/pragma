import { describe, expect, it } from "vitest";
import { writeChunked } from "./writeStdout.js";

/** Collect everything {@link writeChunked} writes into one buffer. */
function collect(text: string): Buffer {
  const chunks: Buffer[] = [];
  const stream = {
    write(chunk: string | Uint8Array): boolean {
      chunks.push(Buffer.from(chunk as Uint8Array));
      return true;
    },
  } as unknown as NodeJS.WritableStream;
  writeChunked(stream, text);
  return Buffer.concat(chunks);
}

describe("writeChunked", () => {
  it("round-trips a short string with an astral char", () => {
    const text = "hello 😀 world";
    expect(collect(text).toString("utf8")).toBe(text);
  });

  it("preserves an astral char that straddles the 4 KiB boundary", () => {
    // Place a 4-byte emoji so its UTF-8 bytes span the 4096-byte chunk edge —
    // a UTF-16 string slice there would emit a lone surrogate (U+FFFD).
    const text = `${"a".repeat(4094)}😀${"z".repeat(16)}`;
    const out = collect(text).toString("utf8");
    expect(out).toBe(text);
    expect(out).not.toContain("�");
  });

  it("splits large input into multiple writes", () => {
    let writes = 0;
    const stream = {
      write(): boolean {
        writes++;
        return true;
      },
    } as unknown as NodeJS.WritableStream;
    writeChunked(stream, "x".repeat(10_000));
    expect(writes).toBeGreaterThan(1);
  });
});
