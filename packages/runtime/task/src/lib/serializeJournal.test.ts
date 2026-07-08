import { describe, expect, it } from "vitest";
import deserializeJournal from "./deserializeJournal.js";
import serializeJournal from "./serializeJournal.js";
import type { Journal } from "./types.js";

const journal: Journal = {
  entries: [
    {
      id: { kind: "ReadFile", content: '{"path":"/a"}', branch: "", seq: 0 },
      outcome: { ok: true, value: "hello" },
    },
    {
      id: {
        kind: "Exec",
        content: '{"args":[],"command":"nope","cwd":undefined}',
        branch: "",
        seq: 1,
      },
      outcome: { ok: false, error: { code: "INTERNAL", message: "boom" } },
    },
  ],
};

describe("serializeJournal", () => {
  it("round-trips through deserializeJournal", () => {
    expect(deserializeJournal(serializeJournal(journal))).toEqual(journal);
  });

  it("serialises to a compact JSON encoding of the entries", () => {
    const one: Journal = {
      entries: [
        {
          id: { kind: "ReadFile", content: "{}", branch: "", seq: 0 },
          outcome: { ok: true, value: "x" },
        },
      ],
    };
    expect(serializeJournal(one)).toBe(
      '{"entries":[{"id":{"kind":"ReadFile","content":"{}","branch":"","seq":0},"outcome":{"ok":true,"value":"x"}}]}',
    );
  });

  it("serialises an empty journal", () => {
    expect(serializeJournal({ entries: [] })).toBe('{"entries":[]}');
  });

  it("round-trips an undefined effect result as undefined", () => {
    const withVoid: Journal = {
      entries: [
        {
          id: { kind: "WriteFile", content: "{}", branch: "", seq: 0 },
          outcome: { ok: true, value: undefined },
        },
      ],
    };
    const restored = deserializeJournal(serializeJournal(withVoid));
    const [entry] = restored.entries;
    expect(entry?.outcome).toEqual({ ok: true });
  });
});
