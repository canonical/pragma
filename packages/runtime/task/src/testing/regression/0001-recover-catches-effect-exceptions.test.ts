/**
 * Regression: a real I/O exception thrown while performing an effect must be
 * routable through the recovery channel, not escape the interpreter.
 *
 * Before the fix, only explicit `Fail` nodes reached `recover`/`orElse`; a raw
 * exception (e.g. `ENOENT` from reading a missing file) propagated straight out
 * of `runTask`, so `orElse`/`recover`/`optional` could never see real failures.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { orElse } from "../../lib/combinators.js";
import { runTask } from "../../lib/interpreter.js";
import { readFile } from "../../lib/primitives.js";
import { pure, recover } from "../../lib/task.js";

describe("regression 0001 — recover catches effect exceptions", () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "task-regression-0001-"));
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("recovers from a missing-file read instead of rejecting", async () => {
    const missing = join(dir, "definitely-absent.txt");

    const task = recover(readFile(missing), (err) =>
      pure(`recovered:${err.code}`),
    );

    expect(await runTask(task)).toBe("recovered:FILE_NOT_FOUND");
  });

  it("falls back via orElse when a read fails", async () => {
    const missing = join(dir, "also-absent.txt");

    const task = orElse(readFile(missing), pure("fallback"));

    expect(await runTask(task)).toBe("fallback");
  });
});
