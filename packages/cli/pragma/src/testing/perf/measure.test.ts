/**
 * The measurement helper's runnability guard — the perf pass's one defense
 * against timing a binary that cannot run. The PROTECTED budgets assert only
 * ceilings; pre-fix a 0-byte `dist/pragma` (an interrupted build the
 * staleness gate stats as FRESH — mtime, not runnability) failed every spawn
 * in ~0.3ms and sailed under all four budgets. measureCommand now throws on
 * the FIRST sample whose status is nonzero or whose spawn errored, naming
 * the argv — these cells pin both failure shapes. Budgets.test.ts itself is
 * unchanged: its argvs all exit 0 by contract.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { measureCommand } from "./measure.js";

describe("measureCommand — a failing argv fails the measurement", () => {
  it("a sample that exits nonzero throws loudly, naming the argv and status", () => {
    // `bun -e "process.exit(3)"` is a real spawn that runs and fails — the
    // shape a broken binary produces on every budget argv.
    expect(() =>
      measureCommand(process.execPath, ["-e", "process.exit(3)"], {
        runs: 2,
        warmups: 0,
      }),
    ).toThrowError(
      /measureCommand: `.+ -e process\.exit\(3\)` failed on sample 1\/2 — status 3/,
    );
  });

  it("a binary that cannot spawn at all throws loudly, naming the error", () => {
    const absent = join(mkdtempSync(join(tmpdir(), "measure-absent-")), "nope");
    expect(() =>
      measureCommand(absent, ["--help"], { runs: 1, warmups: 0 }),
    ).toThrowError(/failed on sample 1\/1 — .*error: /);
  });
});
