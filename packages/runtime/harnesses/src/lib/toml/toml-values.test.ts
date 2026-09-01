/**
 * TOML basic-string escaping — the round trip that makes a second `setup` run
 * a no-op.
 *
 * The read-back classifier compares a config's parsed values against what a
 * write WOULD emit, so a value that does not survive serialize→parse reports
 * "updated" on every run forever. Escaping and decoding therefore have to
 * cover the same set of characters, and the cases here pin the ones that
 * previously did not: the backslash (a Windows path went out with bare
 * backslashes, which TOML reads as escape sequences, so Codex saw a different
 * string than we wrote), the control characters (a literal newline in a value
 * would have split the line and corrupted the file), and a correctly escaped
 * PRE-EXISTING value written by hand.
 */

import { describe, expect, it } from "vitest";
import parseTomlSection from "./parseTomlSection.js";
import serializeTomlSection from "./serializeTomlSection.js";
import { formatTomlValue, parseTomlValue } from "./toml-values.js";

/** Serialize a value and read it straight back. */
const roundTrip = (value: unknown): unknown =>
  parseTomlValue(formatTomlValue(value));

describe("formatTomlValue / parseTomlValue — string round trip", () => {
  it("round-trips a Windows path carrying backslashes and an embedded quote", () => {
    const value = 'C:\\Users\\me\\bin\\the "good" one\\';
    const written = formatTomlValue(value);
    // The backslash is escaped BEFORE the quote, so the quote's own escape is
    // not doubled: the escaped quote stays two characters.
    expect(written).toBe(
      '"C:\\\\Users\\\\me\\\\bin\\\\the \\"good\\" one\\\\"',
    );
    expect(parseTomlValue(written)).toBe(value);
  });

  it("round-trips the control characters TOML basic strings forbid literally", () => {
    expect(formatTomlValue("a\nb\tc\rd\be\ff")).toBe('"a\\nb\\tc\\rd\\be\\ff"');
    expect(roundTrip("a\nb\tc\rd\be\ff")).toBe("a\nb\tc\rd\be\ff");
    // No short escape exists for these, so they take the \uXXXX form.
    expect(formatTomlValue("bell\u0007 del\u007f")).toBe(
      '"bell\\u0007 del\\u007f"',
    );
    expect(roundTrip("bell\u0007 del\u007f")).toBe("bell\u0007 del\u007f");
  });

  it("leaves an ordinary string untouched", () => {
    expect(formatTomlValue("pragma")).toBe('"pragma"');
    expect(roundTrip("pragma")).toBe("pragma");
  });

  it("decodes an already-correctly-escaped pre-existing value unchanged", () => {
    // What a hand-written (or previously written) config holds on disk.
    const onDisk = String.raw`"C:\\Users\\me\\bin"`;
    const parsed = parseTomlValue(onDisk);
    expect(parsed).toBe(String.raw`C:\Users\me\bin`);
    // Re-emitting it reproduces the file bytes — this is what makes a second
    // run a no-op instead of a perpetual "updated".
    expect(formatTomlValue(parsed)).toBe(onDisk);
  });

  it("decodes the \\uXXXX and \\UXXXXXXXX forms a hand-written config may use", () => {
    expect(parseTomlValue('"caf\\u00e9 \\U0001F600"')).toBe("café \u{1F600}");
  });

  it("leaves an unrecognised escape sequence verbatim rather than dropping it", () => {
    expect(parseTomlValue('"a\\qb"')).toBe("a\\qb");
  });

  it("round-trips escaped strings nested in an inline array", () => {
    const value = [String.raw`C:\bin`, 'say "hi"'];
    expect(roundTrip(value)).toEqual(value);
  });
});

describe("serializeTomlSection / parseTomlSection — end to end", () => {
  it("round-trips a Windows command path with a quote and a control character", () => {
    const entry = {
      command: String.raw`C:\Program Files\pragma\pragma.cmd`,
      args: ["mcp", 'the "odd" one', "line\nbreak"],
      enabled: true,
    };
    const written = serializeTomlSection("mcp_servers", { pragma: entry });
    // The escaped newline keeps the value on ONE line — a literal one would
    // have split the record and corrupted every entry after it.
    expect(
      written.split("\n").filter((l) => l.startsWith("args")),
    ).toHaveLength(1);
    expect(parseTomlSection(written, "mcp_servers").pragma).toEqual(entry);
  });

  it("re-serializes its own output byte for byte (idempotence)", () => {
    const entries = {
      pragma: {
        command: String.raw`C:\bin\pragma.cmd`,
        args: ['a "b"', String.raw`c\d`],
      },
    };
    const once = serializeTomlSection("mcp_servers", entries);
    const twice = serializeTomlSection(
      "mcp_servers",
      parseTomlSection(once, "mcp_servers"),
    );
    expect(twice).toBe(once);
  });
});
