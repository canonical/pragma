import { describe, expect, it } from "vitest";
import { JournalUnsupportedEffectError } from "./interpreter.js";
import { getContext, setContext } from "./primitives.js";
import recordTask from "./recordTask.js";
import { $, gen } from "./task.js";
import type { Journal } from "./types.js";

// A factory, not a shared instance: a gen-built task holds a single-use
// iterator, so each run needs a freshly-built task.
const greet = () =>
  gen(function* () {
    yield* $(setContext("name", "pragma"));
    const name = yield* $(getContext<string>("name"));
    return `hello ${name}`;
  });

describe("recordTask", () => {
  it("returns the task value and a journal of its effect outcomes", async () => {
    const { value, journal } = await recordTask(greet());

    expect(value).toBe("hello pragma");
    expect(journal.entries.map((entry) => entry.id.kind)).toEqual([
      "WriteContext",
      "ReadContext",
    ]);
    expect(journal.entries.at(1)?.outcome).toEqual({
      ok: true,
      value: "pragma",
    });
  });

  it("numbers entries by position in a fresh branch", async () => {
    const { journal } = await recordTask(greet());
    expect(journal.entries.map((entry) => entry.id.seq)).toEqual([0, 1]);
    expect(journal.entries.every((entry) => entry.id.branch === "")).toBe(true);
  });

  it("ignores any journal supplied in options, recording into a fresh one", async () => {
    const seeded: Journal = {
      entries: [
        {
          id: { kind: "Log", content: "{}", branch: "", seq: 0 },
          outcome: { ok: true, value: undefined },
        },
      ],
    };

    const { journal } = await recordTask(greet(), { journal: seeded });

    expect(journal).not.toBe(seeded);
    expect(journal.entries).toHaveLength(2);
    expect(seeded.entries).toHaveLength(1);
  });

  it("fails closed on a result that would not survive JSON persistence", async () => {
    // A bigint makes JSON.stringify throw; a Date silently mangles to a string —
    // both would break a replay, so recording fails closed instead.
    await expect(
      recordTask(getContext("k"), { context: new Map([["k", 10n]]) }),
    ).rejects.toBeInstanceOf(JournalUnsupportedEffectError);
    await expect(
      recordTask(getContext("k"), { context: new Map([["k", new Date(0)]]) }),
    ).rejects.toBeInstanceOf(JournalUnsupportedEffectError);
  });
});
