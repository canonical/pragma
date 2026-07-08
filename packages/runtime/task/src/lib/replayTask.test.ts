import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { orElse } from "./combinators.js";
import { JournalDivergenceError } from "./interpreter.js";
import { readFile } from "./primitives.js";
import recordTask from "./recordTask.js";
import replayTask from "./replayTask.js";
import { $, gen, pure } from "./task.js";

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
});
