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
 * ## Mirroring is not exercising — the last case
 *
 * The rows above drive `planParity.ts`, which MIRRORS the dispatcher's plan
 * branch rather than calling it. That proves the interpreter's behaviour and
 * nothing about the shipped wiring: deleting `onEffectStart` from BOTH plan
 * branches (CLI dispatcher and MCP projector) left this whole package green —
 * 1121 passed, 0 failed — while `create component --dry-run` planned every
 * generated file short by exactly its generated-by stamp — 58 bytes for the
 * line-comment form, 61 for `styles.css`'s CSS block-comment form. The final
 * case closes
 * that by driving `executeVerb` itself and comparing the RENDERED byte counts
 * against the paired real run's files on disk.
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
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Effect } from "@canonical/task";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { configModule } from "../../capabilities/config/index.js";
import { createVerbs } from "../../capabilities/create/create.verb.js";
import { tokenModule } from "../../capabilities/token/index.js";
import { globalConfigPath } from "../../kernel/config/paths.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
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
const createVerb = createVerbs.component as VerbSpec;

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

  it("create component plans the STAMPED bytes, not the generator's", async () => {
    // The one class the other rows cannot reach: a verb whose `rt.exec` carries
    // a content-shaping callback. `create` prepends a generated-by stamp on the
    // effect seam, and until PR7's fix-fold the plan branch passed no callbacks
    // at all — so `--dry-run` reported `src/index.ts (64 bytes)` where `--yes`
    // wrote 114, on every generated file, in the shipped binary.
    const params = {
      framework: "react",
      componentPath: "src/Widget",
      withStyles: true,
      withStories: false,
      withSsrTests: false,
    };
    const before = snapshotTree(project);

    const plan = await interpretAsPlan(createVerb, params, runtime());
    expect(snapshotTree(project)).toEqual(before);

    const run = await interpretForReal(createVerb, params, runtime());
    expectReadParity({ plan, run });

    // And the absolute claim, so a regression that dropped the stamp from BOTH
    // sides still fails: what the plan says it will write is what is on disk.
    const planned = plan.effects.filter(
      (effect): effect is Extract<Effect, { _tag: "WriteFile" }> =>
        effect._tag === "WriteFile",
    );
    expect(planned.length).toBeGreaterThan(0);
    for (const effect of planned) {
      expect(effect.content).toContain("Generated by");
      expect(readFileSync(join(project, effect.path), "utf-8")).toBe(
        effect.content,
      );
    }
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
    const before = snapshotTree(xdg);
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
    // Still no partial state: the directory is untouched and nothing appeared
    // beside it. This used to read `existsSync(join(globalConfigPath(),
    // "config.json"))` — a path nothing in the tree can create, since
    // `globalConfigPath()` IS `<xdg>/<bin>/config.json` and `writeConfigField`
    // writes to it directly (and here fails EISDIR). The assertion could not
    // fail for any behaviour of the code under test.
    expect(readdirSync(globalConfigPath())).toEqual([]);
    expect(snapshotTree(xdg)).toEqual(before);
  });
});

describe("the SHIPPED --dry-run branch reports the bytes the run writes", () => {
  it("create component: every planned byte count is the file's real length", async () => {
    // The row every other case in this file cannot be. The rest mirror the
    // dispatcher's plan-branch construction inside `planParity.ts`, so they
    // prove `planTask` applies a shaping callback WHEN ONE IS PASSED — never
    // that `dispatch.ts` still passes one. Measured on this branch: deleting
    // `onEffectStart` from both shipped plan branches left the package green
    // (1121 passed, 0 failed) while `create component --dry-run` planned
    // `Widget.tsx (432) / types.ts (199) / index.ts (82) / Widget.tests.tsx
    // (759) / Widget.ssr.tests.tsx (364) / Widget.stories.tsx (459) /
    // styles.css (39)` against a real run writing `490 / 257 / 140 / 817 / 422
    // / 517 / 100` — every file short by exactly its generated-by stamp, which
    // is the PRA-104 residue this suite exists to close. Not one number: 58
    // bytes for the six files taking the line-comment form, 61 for `styles.css`
    // and its CSS block-comment form (39 → 100), measured by splitting each
    // generated file at its stamp. This row recomputes neither — it compares
    // against `Buffer.byteLength` of what is on disk.
    //
    // So this drives `executeVerb` — the shipped dispatcher, plan branch
    // included — and reads the byte count back out of the RENDERED plan line,
    // because that string is what a user is told. The comparison is against the
    // paired real run's files on disk, not against a recomputation of the
    // stamp: `Buffer.byteLength` of what is actually there.
    const params = {
      framework: "react",
      componentPath: "src/Widget",
      withStyles: true,
      withStories: true,
      withSsrTests: true,
    };
    const mutation = { undo: false, yes: false };

    const preview = await executeVerb(
      createVerb,
      params,
      { ...mutation, dryRun: true },
      runtime(),
    );
    expect(preview.exitCode).toBe(0);
    expect(readdirSync(project)).toEqual([]);

    // `Write file: <path> (<n> bytes)` — `describeEffect`'s rendering.
    const planned = new Map<string, number>();
    for (const line of (preview.stdout ?? "").split("\n")) {
      const match = /Write file: (\S+) \((\d+) bytes\)/.exec(line);
      if (match?.[1] && match[2]) planned.set(match[1], Number(match[2]));
    }
    expect(planned.size).toBeGreaterThan(0);

    const real = await executeVerb(
      createVerb,
      params,
      { ...mutation, dryRun: false, yes: true },
      runtime(),
    );
    expect(real.exitCode).toBe(0);

    for (const [relative, bytes] of planned) {
      const onDisk = readFileSync(join(project, relative));
      expect(
        Buffer.byteLength(onDisk),
        `${relative}: plan said ${bytes} bytes`,
      ).toBe(bytes);
      // And the stamp is genuinely in play, so this row cannot pass by both
      // sides being unstamped — which is how the shortfall hid.
      expect(onDisk.toString("utf-8")).toContain("Generated by");
    }
  });

  it("token add-config: the planned count is BYTES, not code units", async () => {
    // The row above cannot hold that claim on its own, and did not: every file
    // `create component` and `create package` write is pure ASCII (490 / 257 /
    // 140 / 817 / 422 / 517 / 100 and 1191 / 155 / 97 / 114 / 309), so
    // `String.length` and the UTF-8 byte count coincide and the assertion
    // passed against a producer that had never measured bytes. `describeEffect`
    // reported `effect.content.length` under the label "bytes".
    //
    // `tokens.config.mjs` carries exactly one non-ASCII character — the U+2014
    // em dash in its `// tokens.config.mjs — generated by ...` header — so it is
    // the smallest live fixture that separates the two readings. Measured on
    // this branch before the fix: `--dry-run` said 389, `--yes` wrote 391.
    // `setup completions` is the second live case — `templates/bash.ts` writes
    // the same em dash into its script header — and the number reaches an agent
    // through `--format json`, not only a human through `plain`.
    const mutation = { undo: false, yes: false };

    const preview = await executeVerb(
      addConfigVerb,
      {},
      { ...mutation, dryRun: true },
      runtime(),
    );
    expect(preview.exitCode).toBe(0);
    expect(readdirSync(project)).toEqual([]);

    const match = /Write file: (\S+) \((\d+) bytes\)/.exec(
      preview.stdout ?? "",
    );
    expect(match, preview.stdout).not.toBeNull();
    const plannedPath = match?.[1] as string;
    const plannedBytes = Number(match?.[2]);

    const real = await executeVerb(
      addConfigVerb,
      {},
      { ...mutation, dryRun: false, yes: true },
      runtime(),
    );
    expect(real.exitCode).toBe(0);

    const onDisk = readFileSync(plannedPath);
    expect(Buffer.byteLength(onDisk)).toBe(plannedBytes);
    // The fixture is only load-bearing while it is genuinely non-ASCII: without
    // this, a template edit dropping the em dash would silently return the row
    // to the accident the `create` row is stuck in.
    expect(onDisk.toString("utf-8")).toContain("—");
    expect(Buffer.byteLength(onDisk)).toBeGreaterThan(
      onDisk.toString("utf-8").length,
    );
  });
});
