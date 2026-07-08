/**
 * Regression: replaying a task against a recorded journal must reproduce the
 * run purely from the journal, performing no I/O — even if the files it read
 * during recording have since changed or been deleted.
 *
 * This is the determinism guarantee the journal exists to provide: a recorded
 * run is a self-contained, replayable artifact. If replay silently fell back to
 * live execution, a deleted input would surface as an `ENOENT` here instead of
 * the recorded value.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFile } from "../../lib/primitives.js";
import recordTask from "../../lib/recordTask.js";
import replayTask from "../../lib/replayTask.js";
import { $, gen } from "../../lib/task.js";

describe("regression 0003 — journal replay performs no I/O", () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "task-regression-0003-"));
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("reproduces a multi-read run after its inputs are deleted", async () => {
    const first = join(dir, "first.txt");
    const second = join(dir, "second.txt");
    writeFileSync(first, "one");
    writeFileSync(second, "two");

    // A gen task holds a single-use iterator, so record and replay each get a
    // freshly-built task — exactly as a resumed run would rebuild it.
    const readBoth = () =>
      gen(function* () {
        const a = yield* $(readFile(first));
        const b = yield* $(readFile(second));
        return `${a}:${b}`;
      });

    const recorded = await recordTask(readBoth());
    expect(recorded.value).toBe("one:two");

    // Delete the inputs entirely — a live read would now throw ENOENT.
    rmSync(first);
    rmSync(second);

    const replayed = await replayTask(readBoth(), recorded.journal);
    expect(replayed.value).toBe("one:two");
  });
});
