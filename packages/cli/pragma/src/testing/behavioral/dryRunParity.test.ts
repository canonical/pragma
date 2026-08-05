/**
 * `--dry-run` READ FIDELITY: a plan's reads must observe what the run's reads
 * observe (PROTECTED).
 *
 * This is the harness PR7's ruling asks for, and it is as much the deliverable
 * as the fix. Each row runs ONE real capability twice against the SAME fixture
 * state — once as a plan, once for real — and asserts the two effect sequences
 * agree on everything a read could have decided: same tags in the same order,
 * same paths, same `WriteFile` bytes. The fixture tree is snapshotted before the
 * plan and asserted byte-identical after, so "the plan reads for real" can never
 * quietly become "the plan writes".
 *
 * ## The measurement this exists for
 *
 * `pragma config set tier apps/lxd`, against a global config already holding
 * `{"channel":"experimental","detail":"detailed"}`:
 *
 * | | plan | run |
 * |---|---|---|
 * | before the fix | `Check exists / Created dir / Write file (25 bytes)` | `… Read file … Write file (78 bytes)` |
 * | after | `Check exists / Read file / Created dir / Write file (78 bytes)` | identical |
 *
 * The old plan reported no read at all — `mockEffectWithFs` answered `exists`
 * from a virtual set that starts empty, so the read-and-merge branch was never
 * entered — and advertised a 25-byte write that would have deleted two of the
 * user's settings. It exited 0.
 *
 * ## The boundary, stated rather than omitted
 *
 * Parity here is parity of the effects a task REACHES. It does not extend to
 * what remains simulated inside the plan: `Exec` answers empty-and-successful,
 * so a task branching on a command's output is outside this harness's reach,
 * and `CopyFile`/`CopyDirectory` sources are not probed. Those are named in
 * `@canonical/task`'s `lib/plan.ts` docblock as the interpreter's residual
 * falsehoods; the harness's silence about them is a stated boundary.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { configModule } from "../../capabilities/config/index.js";
import { tokenModule } from "../../capabilities/token/index.js";
import { globalConfigPath } from "../../kernel/config/paths.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags, PragmaRuntime } from "../../kernel/runtime/types.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  expectReadParity,
  interpretAsPlan,
  interpretForReal,
  snapshotTree,
} from "../helpers/planParity.js";
import { runCli } from "../helpers/runCli.js";

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};

const setVerb = configModule.verbs.find((v) => v.path[1] === "set") as VerbSpec;
const addConfigVerb = tokenModule.verbs.find(
  (v) => v.path[1] === "add-config",
) as VerbSpec;

let xdg: string;
let project: string;
const roots: string[] = [];

const tmp = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
};

let prevXdg: string | undefined;

beforeEach(() => {
  prevXdg = process.env.XDG_CONFIG_HOME;
  xdg = tmp("pragma-parity-xdg-");
  process.env.XDG_CONFIG_HOME = xdg;
  project = tmp("pragma-parity-proj-");
});

afterEach(() => {
  process.env.XDG_CONFIG_HOME = prevXdg;
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

/** Seed the global config file with exact bytes. */
function seedGlobalConfig(body: string): string {
  const path = globalConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
  return path;
}

/** Boot a runtime pointed at the per-test project dir. */
const runtime = (): PragmaRuntime => bootRuntime(FLAGS, project);

describe("dry-run read fidelity — the plan observes what the run observes", () => {
  it("config set MERGES the existing document, and the plan says so (78 == 78)", async () => {
    const path = seedGlobalConfig(
      `${JSON.stringify({ channel: "experimental", detail: "detailed" }, null, 2)}\n`,
    );
    const params = { key: "tier", value: "apps/lxd" };
    const before = snapshotTree(xdg);

    const plan = await interpretAsPlan(setVerb, params, runtime());
    expect(snapshotTree(xdg)).toEqual(before);

    // The plan performs the read; the mocked collector never did.
    expect(plan.effects.map((e) => e._tag)).toContain("ReadFile");

    const run = await interpretForReal(setVerb, params, runtime());
    expectReadParity({ plan, run });

    // And the absolute number, so a regression that made BOTH sides wrong in
    // the same way still fails: the merged document is 78 bytes and keeps the
    // two fields the user already had.
    const written = readFileSync(path, "utf-8");
    expect(Buffer.byteLength(written)).toBe(78);
    expect(JSON.parse(written)).toEqual({
      channel: "experimental",
      detail: "detailed",
      tier: "apps/lxd",
    });
  });

  it("config set with NO existing config plans no read at all", async () => {
    // The mirror of the row above, and it is what keeps this harness honest in
    // BOTH directions: the other historical mock — `mockEffect`'s unconditional
    // `Exists -> true` — is CORRECT for every fixture where the file is there.
    // Only a fixture where it is absent catches it: a plan answering `true`
    // here would attempt a real read of a missing file and fail where the run
    // succeeds.
    const params = { key: "tier", value: "apps/lxd" };

    const plan = await interpretAsPlan(setVerb, params, runtime());
    expect(plan.effects.map((e) => e._tag)).toEqual([
      "Exists",
      "MakeDir",
      "WriteFile",
    ]);

    const run = await interpretForReal(setVerb, params, runtime());
    expectReadParity({ plan, run });
  });

  it("config set over a CORRUPT config plans the backup write and the warning", async () => {
    seedGlobalConfig("{ this is not json");
    const params = { key: "tier", value: "apps/lxd" };
    const before = snapshotTree(xdg);

    const plan = await interpretAsPlan(setVerb, params, runtime());
    expect(snapshotTree(xdg)).toEqual(before);

    // The whole corrupt-recovery branch is reachable ONLY through a real read.
    // With `exists` mocked false it was skipped, so neither the backup write
    // nor the warning appeared in the plan.
    expect(plan.effects.map((e) => e._tag)).toEqual([
      "Exists",
      "ReadFile",
      "WriteFile",
      "Log",
      "MakeDir",
      "WriteFile",
    ]);

    const run = await interpretForReal(setVerb, params, runtime());
    // The backup path carries an ISO timestamp minted per construction, so the
    // two runs legitimately differ there and only there.
    expectReadParity({ plan, run }, (value) =>
      value.replace(/\.corrupt-[0-9TZ:.-]+/g, ".corrupt-<STAMP>"),
    );
  });

  it("token add-config agrees on alreadyExisted — a VALUE no plan line shows", async () => {
    writeFileSync(join(project, "tokens.config.mjs"), "// pre-existing\n");
    const before = snapshotTree(project);

    const plan = await interpretAsPlan(addConfigVerb, {}, runtime());
    expect(snapshotTree(project)).toEqual(before);

    const run = await interpretForReal(addConfigVerb, {}, runtime());
    expectReadParity({ plan, run });

    // `describeEffect` never renders this, so only the Task's VALUE catches it.
    // Under the mocking collector `exists` answered false and the plan claimed
    // it would create a file it was in fact about to overwrite.
    expect((plan.value as { alreadyExisted: boolean }).alreadyExisted).toBe(
      true,
    );
    expect((run.value as { alreadyExisted: boolean }).alreadyExisted).toBe(
      true,
    );
  });
});

describe("dry-run cannot exit 0 when the real run dies on a read (PROTECTED)", () => {
  it("plan and run fail identically when the config path is a DIRECTORY", async () => {
    // A directory at the config path: `exists` succeeds (so the read-and-merge
    // branch IS entered) and `readFile` then fails EISDIR. Chosen over chmod
    // 000 because this box runs as root and permission bits are not enforced.
    //
    // Driven through the PROCESS boundary, because the exit code is the claim:
    // `executeVerb` throws and it is `dispatch` that maps the throw to a code.
    mkdirSync(globalConfigPath(), { recursive: true });
    const env = { XDG_CONFIG_HOME: xdg };
    const args = ["config", "set", "tier", "apps/lxd"];

    const dry = runCli([...args, "--dry-run"], {
      cwd: project,
      env,
      mode: "source",
    });
    const real = runCli([...args, "--yes"], {
      cwd: project,
      env,
      mode: "source",
    });

    expect(dry.exitCode).not.toBe(0);
    expect(dry.exitCode).toBe(real.exitCode);
    expect(dry.stdout).not.toContain("Dry run");
    // Still no partial state: the directory is untouched and no file appeared.
    expect(existsSync(join(globalConfigPath(), "config.json"))).toBe(false);
  });
});
