import { describe, expect, it } from "vitest";
import deserializeJournal from "./deserializeJournal.js";

const validId = { kind: "ReadFile", content: "{}", branch: "", seq: 0 };
const wrap = (entry: unknown): string => JSON.stringify({ entries: [entry] });

describe("deserializeJournal", () => {
  it("parses a well-formed success entry", () => {
    const text = wrap({ id: validId, outcome: { ok: true, value: "x" } });
    expect(deserializeJournal(text)).toEqual({
      entries: [{ id: validId, outcome: { ok: true, value: "x" } }],
    });
  });

  it("parses a void-effect success entry whose value is absent", () => {
    const text = wrap({
      id: { ...validId, kind: "WriteFile" },
      outcome: { ok: true },
    });
    expect(deserializeJournal(text).entries).toHaveLength(1);
  });

  it("fails closed when an always-valued effect success has no recorded value", () => {
    // A ReadFile that "succeeded" with no value is corrupt — it would replay as
    // undefined instead of the file's contents.
    const text = wrap({ id: validId, outcome: { ok: true } });
    expect(() => deserializeJournal(text)).toThrow(/not a well-formed journal/);
  });

  it("parses a failure entry with a TaskError-shaped error", () => {
    const text = wrap({
      id: validId,
      outcome: { ok: false, error: { code: "FILE_NOT_FOUND", message: "no" } },
    });
    expect(deserializeJournal(text).entries).toHaveLength(1);
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
    expect(() => deserializeJournal(wrap(1))).toThrow(
      /not a well-formed journal/,
    );
  });

  it("fails closed when an entry id is not an object", () => {
    expect(() =>
      deserializeJournal(wrap({ id: 1, outcome: { ok: true } })),
    ).toThrow(/not a well-formed journal/);
  });

  it.each([
    ["kind", { ...validId, kind: 1 }],
    ["content", { ...validId, content: 1 }],
    ["branch", { ...validId, branch: 1 }],
    ["seq", { ...validId, seq: "0" }],
  ])("fails closed when the effect id %s is the wrong type", (_field, id) => {
    expect(() =>
      deserializeJournal(wrap({ id, outcome: { ok: true } })),
    ).toThrow(/not a well-formed journal/);
  });

  it("fails closed when the outcome is not an object", () => {
    expect(() => deserializeJournal(wrap({ id: validId, outcome: 1 }))).toThrow(
      /not a well-formed journal/,
    );
  });

  it("fails closed when the outcome has no ok discriminant", () => {
    expect(() =>
      deserializeJournal(wrap({ id: validId, outcome: {} })),
    ).toThrow(/not a well-formed journal/);
  });

  it("fails closed when a failure outcome has no TaskError-shaped error", () => {
    expect(() =>
      deserializeJournal(
        wrap({ id: validId, outcome: { ok: false, error: 1 } }),
      ),
    ).toThrow(/not a well-formed journal/);
  });

  it.each([
    ["code", { code: 1, message: "m" }],
    ["message", { code: "X", message: 1 }],
  ])("fails closed when a failure error %s is the wrong type", (_field, error) => {
    expect(() =>
      deserializeJournal(wrap({ id: validId, outcome: { ok: false, error } })),
    ).toThrow(/not a well-formed journal/);
  });
});
