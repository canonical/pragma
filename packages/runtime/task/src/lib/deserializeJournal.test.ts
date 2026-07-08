import { describe, expect, it } from "vitest";
import deserializeJournal from "./deserializeJournal.js";

describe("deserializeJournal", () => {
  it("parses a well-formed journal", () => {
    const text =
      '{"entries":[{"id":{"kind":"ReadFile","content":"{}","branch":"","seq":0},"outcome":{"ok":true,"value":"x"}}]}';
    expect(deserializeJournal(text)).toEqual({
      entries: [
        {
          id: { kind: "ReadFile", content: "{}", branch: "", seq: 0 },
          outcome: { ok: true, value: "x" },
        },
      ],
    });
  });

  it("parses an empty journal", () => {
    expect(deserializeJournal('{"entries":[]}')).toEqual({ entries: [] });
  });

  it("fails closed with a TypeError on invalid JSON", () => {
    expect(() => deserializeJournal("not json")).toThrow(TypeError);
    expect(() => deserializeJournal("not json")).toThrow(/not valid JSON/);
  });

  it("fails closed on JSON null", () => {
    expect(() => deserializeJournal("null")).toThrow(
      /not a well-formed journal/,
    );
  });

  it("fails closed on a non-object", () => {
    expect(() => deserializeJournal("42")).toThrow(/not a well-formed journal/);
  });

  it("fails closed when entries is not an array", () => {
    expect(() => deserializeJournal('{"entries":5}')).toThrow(
      /not a well-formed journal/,
    );
  });

  it("fails closed when an entry is not an object", () => {
    expect(() => deserializeJournal('{"entries":[1]}')).toThrow(
      /not a well-formed journal/,
    );
  });

  it("fails closed when an entry id is not an object", () => {
    expect(() =>
      deserializeJournal('{"entries":[{"id":1,"outcome":{}}]}'),
    ).toThrow(/not a well-formed journal/);
  });

  it("fails closed when an entry outcome is not an object", () => {
    expect(() =>
      deserializeJournal('{"entries":[{"id":{},"outcome":1}]}'),
    ).toThrow(/not a well-formed journal/);
  });
});
