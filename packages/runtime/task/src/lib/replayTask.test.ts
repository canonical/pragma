import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { orElse } from "./combinators.js";
import {
  JournalDivergenceError,
  JournalIncompleteError,
} from "./interpreter.js";
import { getContext, readFile, setContext } from "./primitives.js";
import recordTask from "./recordTask.js";
import replayTask from "./replayTask.js";
import serializeJournal from "./serializeJournal.js";
import { $, gen, pure, recover } from "./task.js";

describe("replayTask", () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "task-replay-"));
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("replays a recorded read without touching the filesystem", async () => {
    const file = join(dir, "read.txt");
    writeFileSync(file, "v1");

    const readIt = readFile(file);
    const recorded = await recordTask(readIt);
    expect(recorded.value).toBe("v1");

    // Change the world; a replay must ignore it and return the recorded value.
    writeFileSync(file, "v2");
    const replayed = await replayTask(readIt, recorded.journal);
    expect(replayed.value).toBe("v1");
  });

  it("resumes past the recorded prefix without mutating the input journal", async () => {
    const a = join(dir, "a.txt");
    const b = join(dir, "b.txt");
    writeFileSync(a, "A");
    writeFileSync(b, "B");

    const prefix = await recordTask(readFile(a));

    const both = gen(function* () {
      const x = yield* $(readFile(a));
      const y = yield* $(readFile(b));
      return `${x}${y}`;
    });

    const { value, journal } = await replayTask(both, prefix.journal);

    expect(value).toBe("AB");
    expect(prefix.journal.entries).toHaveLength(1);
    expect(journal.entries).toHaveLength(2);
  });

  it("throws JournalDivergenceError when the task shape diverges", async () => {
    const a = join(dir, "diverge-a.txt");
    const b = join(dir, "diverge-b.txt");
    writeFileSync(a, "A");
    writeFileSync(b, "B");

    const recorded = await recordTask(readFile(a));

    await expect(
      replayTask(readFile(b), recorded.journal),
    ).rejects.toBeInstanceOf(JournalDivergenceError);
  });

  it("reproduces a recovered failure on replay without re-attempting the I/O", async () => {
    const missing = join(dir, "absent.txt");
    const task = orElse(readFile(missing), pure("fallback"));

    const recorded = await recordTask(task);
    expect(recorded.value).toBe("fallback");
    expect(recorded.journal.entries).toHaveLength(1);
    expect(recorded.journal.entries.at(0)?.outcome).toMatchObject({
      ok: false,
      error: { code: "FILE_NOT_FOUND" },
    });

    // The file now exists — replay must still reproduce the recorded failure.
    writeFileSync(missing, "now here");
    const replayed = await replayTask(task, recorded.journal);
    expect(replayed.value).toBe("fallback");
  });

  it("replays a recovered failure consistently, keying on the preserved error code", async () => {
    const missing = join(dir, "cause.txt");
    // A journaled failure carries its code and message; a handler keying on the
    // code takes the same branch on record and replay.
    const build = () => recover(readFile(missing), (err) => pure(err.code));

    const recorded = await recordTask(build());
    expect(recorded.value).toBe("FILE_NOT_FOUND");

    writeFileSync(missing, "exists");
    const replayed = await replayTask(build(), recorded.journal);
    expect(replayed.value).toBe("FILE_NOT_FOUND");
  });

  it("records a failure as a serialisable {code,message} projection with no cause or stack", async () => {
    const missing = join(dir, "serialise-fail.txt");
    const recorded = await recordTask(orElse(readFile(missing), pure("ok")));

    // Exactly code + message — no raw cause or non-deterministic stack — so a
    // recorded failure can never break serializeJournal.
    expect(recorded.journal.entries.at(0)?.outcome).toEqual({
      ok: false,
      error: { code: "FILE_NOT_FOUND", message: expect.any(String) },
    });
    expect(() => serializeJournal(recorded.journal)).not.toThrow();
  });

  it("reconstructs in-memory context across a resume so a live read sees a replayed write", async () => {
    const build = () =>
      gen(function* () {
        yield* $(setContext("k", "v"));
        const value = yield* $(getContext<string>("k"));
        return value;
      });

    const recorded = await recordTask(build());
    expect(recorded.value).toBe("v");

    // Truncate to just the WriteContext entry — a crash before the read was
    // recorded. Resuming replays the write, then reads context live.
    const partial = { entries: recorded.journal.entries.slice(0, 1) };
    const resumed = await replayTask(build(), partial);
    expect(resumed.value).toBe("v");
  });

  it("fails closed when a single-use gen task is replayed without being rebuilt", async () => {
    const first = join(dir, "reuse-a.txt");
    const second = join(dir, "reuse-b.txt");
    writeFileSync(first, "A");
    writeFileSync(second, "B");

    const single = gen(function* () {
      const a = yield* $(readFile(first));
      const b = yield* $(readFile(second));
      return `${a}${b}`;
    });

    const recorded = await recordTask(single);
    expect(recorded.value).toBe("AB");

    // Reusing the exhausted instance ends after one effect — caught, not silent.
    await expect(replayTask(single, recorded.journal)).rejects.toBeInstanceOf(
      JournalIncompleteError,
    );
  });
});
