/**
 * The interaction-decision corners on the REAL summon bin, one subprocess per
 * cell — the summon-side pins of the shared truth table (§B of the parity
 * contract; the 32-cell exhaustive test lives in summon-core).
 *
 * Non-TTY throughout (a piped child is the CI shape). Covered here:
 *  - row 6: a bare non-TTY mutation REFUSES (message + exit 2, no Ink mount);
 *  - row 5: a fully-explicit non-TTY invocation runs without `--yes`;
 *  - row 1/2: `--dry-run`/`--undo` are batch renders, dry-run taking
 *    precedence, and a missing/invalid batch answer errors loudly (exit 2);
 *  - the run arm's exit codes: an execution failure renders in the App and
 *    exits 1 (parity-contract §3 — never exit 0 on a rendered failure);
 *  - the exit classification's INFORMATIONAL branches: `--help`/`--version`
 *    exit 0, the root invoked with options but no command carries the help
 *    error's own exit 1, the implicit `help` command exits 0 — the branches
 *    a blanket exit-2 refactor would silently break — and the projection's
 *    bare-namespace arm (help on stderr, exit 1, the `help [command]` row);
 *  - the designed excess-positional error (exit 2).
 */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "../..");
const repoRoot = resolve(packageRoot, "../..");
const summonBin = join(packageRoot, "src/bin.tsx");
const taskDist = join(repoRoot, "runtime/task/dist/esm/index.js");
const coreDist = join(repoRoot, "summon/core/dist/esm/index.js");

const freshCwd = (): string => mkdtempSync(join(tmpdir(), "summon-inter-"));

/**
 * A fixture generator tree served via `--generators`: one `gadget` generator
 * with a REQUIRED (default-less) prompt, a select, and a validated text — the
 * shapes the builtin generators (all-defaulted) cannot exercise.
 */
function writeFixtureGenerators(): string {
  const dir = mkdtempSync(join(tmpdir(), "summon-fixture-gen-"));
  mkdirSync(join(dir, "gadget"));
  writeFileSync(
    join(dir, "gadget", "index.js"),
    `import { writeFile } from ${JSON.stringify(`file://${taskDist}`)};
export default {
  meta: { name: "gadget", displayName: "gadget", description: "A fixture gadget", version: "0.0.1" },
  prompts: [
    { name: "title", type: "text", message: "Title:" },
    { name: "kind", type: "select", message: "Kind:", choices: [
      { label: "a", value: "a" }, { label: "b", value: "b" },
    ], default: "a" },
    { name: "outPath", type: "text", message: "Output path:", default: "out.txt",
      validate: (v) => v !== "bad" || "path must not be bad" },
  ],
  generate: (answers) =>
    writeFile(answers.outPath, "# " + answers.title + " (" + answers.kind + ")\\n"),
};
`,
  );
  // A generator whose `generate` throws a PLAIN Error — the non-typed class
  // (application/react's name-derivation throw is the shipped shape). §3:
  // any execution failure past the validation gate exits 1 in every arm.
  mkdirSync(join(dir, "explosive"));
  writeFileSync(
    join(dir, "explosive", "index.js"),
    `export default {
  meta: { name: "explosive", displayName: "explosive", description: "A throwing fixture", version: "0.0.1" },
  prompts: [],
  generate: () => { throw new Error("fixture generate exploded"); },
};
`,
  );
  // A generator with a CROSS-answer guard raised as summon-core's typed
  // invalid answer — the shape application/react's ssr+router guard uses.
  mkdirSync(join(dir, "guarded"));
  writeFileSync(
    join(dir, "guarded", "index.js"),
    `import { writeFile } from ${JSON.stringify(`file://${taskDist}`)};
import { invalidAnswersError } from ${JSON.stringify(`file://${coreDist}`)};
export default {
  meta: { name: "guarded", displayName: "guarded", description: "A guarded fixture", version: "0.0.1" },
  prompts: [
    { name: "ok", type: "confirm", message: "OK?", default: true },
  ],
  generate: (answers) => {
    if (answers.ok !== true) {
      throw invalidAnswersError("OK is required — drop --no-ok.");
    }
    return writeFile("ok.txt", "ok\\n");
  },
};
`,
  );
  return dir;
}

const fixtureDir = writeFixtureGenerators();

/** Spawn the real bin non-interactively; never throws on nonzero exit. */
function run(
  args: readonly string[],
  cwd: string,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync("bun", [summonBin, ...args], {
    cwd,
    encoding: "utf-8",
    input: "",
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

describe("row 6 — non-TTY refusal (PROTECTED)", () => {
  it("a bare mutation refuses with the shared message, exit 2, nothing written", () => {
    const cwd = freshCwd();
    const { status, stderr } = run(["example", "hello"], cwd);
    expect(status).toBe(2);
    expect(stderr).toContain(
      "Refusing to scaffold in a non-interactive run without complete input. " +
        "Pass --yes to accept defaults, --dry-run to preview, or provide every answer as a flag. " +
        "Missing: --name, --description, --greeting, --with-readme.",
    );
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);

  it("partial flags still refuse, naming only what is missing", () => {
    const cwd = freshCwd();
    const { status, stderr } = run(
      ["example", "hello", "--name=demo", "--greeting=Hi"],
      cwd,
    );
    expect(status).toBe(2);
    expect(stderr).toContain("Missing: --description, --with-readme.");
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);
});

describe("row 5 — fully-explicit non-TTY runs without --yes", () => {
  it("generates when every answer is explicit", () => {
    const cwd = freshCwd();
    const { status } = run(
      [
        "example",
        "hello",
        "--name=demo",
        "--description=A demo.",
        "--greeting=Hi",
        "--no-with-readme",
      ],
      cwd,
    );
    expect(status).toBe(0);
    expect(readdirSync(cwd)).toContain("demo");
    expect(readdirSync(join(cwd, "demo"))).not.toContain("README.md");
  }, 60_000);

  it("fixture: explicit title+kind+path runs (select equal to its default is still explicit)", () => {
    const cwd = freshCwd();
    const { status } = run(
      [
        "--generators",
        fixtureDir,
        "gadget",
        "--title=T",
        "--kind=a",
        "--out-path=made.txt",
      ],
      cwd,
    );
    expect(status).toBe(0);
    expect(readdirSync(cwd)).toEqual(["made.txt"]);
  }, 60_000);
});

describe("rows 1–2 — batch dry-run/undo, dry-run precedence, loud failures", () => {
  it("a bare --dry-run renders the batch plan from defaults, writes nothing", () => {
    const cwd = freshCwd();
    const { status, stdout } = run(["example", "hello", "--dry-run"], cwd);
    expect(status).toBe(0);
    expect(stdout).toContain("Plan:");
    expect(stdout).toContain("Dry-run complete. No files were modified.");
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);

  it("--dry-run takes precedence over --undo", () => {
    const cwd = freshCwd();
    const { status, stdout } = run(
      ["example", "hello", "--dry-run", "--undo"],
      cwd,
    );
    expect(status).toBe(0);
    expect(stdout).toContain("Plan:");
    expect(stdout).not.toContain("Undo");
  }, 60_000);

  it("--undo without --yes runs the batch undo (no wizard, no prompt)", () => {
    const cwd = freshCwd();
    execFileSync(
      "bun",
      [
        summonBin,
        "example",
        "hello",
        "--name=demo",
        "--description=D.",
        "--greeting=Hi",
        "--yes",
      ],
      { cwd, stdio: "pipe", input: "" },
    );
    expect(readdirSync(cwd)).toContain("demo");
    const { status, stdout } = run(
      [
        "example",
        "hello",
        "--name=demo",
        "--description=D.",
        "--greeting=Hi",
        "--undo",
      ],
      cwd,
    );
    expect(status).toBe(0);
    expect(stdout).toContain("Undo complete");
  }, 60_000);

  it("a batch dry-run missing a required answer errors loudly, exit 2", () => {
    const cwd = freshCwd();
    const { status, stderr } = run(
      ["--generators", fixtureDir, "gadget", "--dry-run"],
      cwd,
    );
    expect(status).toBe(2);
    expect(stderr).toContain(
      "Missing required flag --title (Title:). Provide it non-interactively, or run interactively to be prompted.",
    );
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);

  it("a batch dry-run with an invalid answer echoes the value, exit 2", () => {
    const cwd = freshCwd();
    const { status, stderr } = run(
      [
        "--generators",
        fixtureDir,
        "gadget",
        "--dry-run",
        "--title=T",
        "--out-path=bad",
      ],
      cwd,
    );
    expect(status).toBe(2);
    expect(stderr).toContain('Invalid --out-path "bad": path must not be bad');
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);

  it("a generator-raised typed invalid answer fails the batch the same way — bare message, exit 2, no stack", () => {
    const cwd = freshCwd();
    const { status, stderr } = run(
      ["--generators", fixtureDir, "guarded", "--no-ok", "--dry-run"],
      cwd,
    );
    expect(status).toBe(2);
    // The WHOLE stream is the message — validateAnswers' own convention.
    expect(stderr).toBe("OK is required — drop --no-ok.\n");
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);

  it("a plain Error from generate() fails the batch as a bare line, exit 1, no stack", () => {
    const cwd = freshCwd();
    const { status, stderr } = run(
      ["--generators", fixtureDir, "explosive", "--dry-run"],
      cwd,
    );
    expect(status).toBe(1);
    // The WHOLE stream is the bare message line — never the un-awaited
    // action's unhandled-rejection stack (a 1.2 KB source frame pre-fix).
    expect(stderr).toBe("fixture generate exploded\n");
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);
});

describe("the run arm's exit codes — a rendered failure never exits 0", () => {
  it("a generator execution failure in the run arm exits 1, error rendered in the App", () => {
    const cwd = freshCwd();
    // `made.txt` pre-created as a DIRECTORY: gadget's writeFile fails
    // mid-execution (EISDIR), the App renders the failure on stdout, and
    // the exit code must carry pragma's runtime class (mapExitCode → 1) —
    // before round 7 every App-rendered failure exited 0.
    mkdirSync(join(cwd, "made.txt"));
    const { status, stdout } = run(
      [
        "--generators",
        fixtureDir,
        "gadget",
        "--title=T",
        "--kind=a",
        "--out-path=made.txt",
        "--yes",
      ],
      cwd,
    );
    expect(status).toBe(1);
    expect(stdout).toContain("✗ Error:");
    expect(stdout).toContain("Code: EXECUTION_ERROR");
  }, 60_000);

  it("a plain Error from generate() in the run arm enters the error phase — exit 1, nothing written", () => {
    const cwd = freshCwd();
    // Pre-fix, the App's catch re-threw the non-typed generate() throw into
    // Ink's error boundary: a source-frame crash box on stdout and EXIT 0 —
    // the silent-success class §3 forbids ("a rendered failure never exits
    // 0"). Now it is the App's own error phase with the runtime class.
    const { status, stdout } = run(
      ["--generators", fixtureDir, "explosive", "--yes"],
      cwd,
    );
    expect(status).toBe(1);
    expect(stdout).toContain("✗ Error: fixture generate exploded");
    expect(stdout).toContain("Code: GENERATE_ERROR");
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);
});

describe("the exit classification's informational branches", () => {
  // Only the usage branch (exit 2) had a pin. `--help`/`--version` pin the
  // 0-branches of bin.tsx's exitOverride catch; the `commander.help` branch
  // (the one that preserves the error's OWN exit code) is reached by the
  // ROOT invoked with options but no command (help on stderr, exit 1) and
  // by the implicit `help` command (stdout help, exit 0) — pinned here so a
  // refactor that collapses the classification to a blanket exit 2 turns
  // red. The bare NAMESPACE never reaches the catch: the projection's
  // namespace action writes the help and sets exit 1 itself, so its cell
  // pins the projection — plus the `help [command]` row that ONLY summon's
  // helpCommand(true) host hook keeps alive.
  it("`--help` exits 0 with the usage on stdout", () => {
    const { status, stdout, stderr } = run(["--help"], freshCwd());
    expect(status).toBe(0);
    expect(stdout).toContain("Usage:");
    expect(stderr).toBe("");
  }, 60_000);

  it("`--version` exits 0", () => {
    const { status, stdout } = run(["--version"], freshCwd());
    expect(status).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  }, 60_000);

  it("the root with options but no command prints the root help on STDERR, exit 1", () => {
    // The one argv shape that still raises `commander.help` at exit 1: the
    // root has subcommands and no action handler, so Commander helps loudly.
    const { status, stdout, stderr } = run(
      ["--generators", fixtureDir],
      freshCwd(),
    );
    expect(status).toBe(1);
    expect(stderr).toContain("Usage: summon");
    expect(stdout).toBe("");
  }, 60_000);

  it("the implicit `help` command exits 0 with the root usage on stdout", () => {
    const { status, stdout } = run(["help"], freshCwd());
    expect(status).toBe(0);
    expect(stdout).toContain("Usage: summon");
  }, 60_000);

  it("`<namespace> help` exits 0 with the namespace usage on stdout — the helpCommand(true) hook", () => {
    const { status, stdout } = run(["example", "help"], freshCwd());
    expect(status).toBe(0);
    expect(stdout).toContain("Usage: summon example");
  }, 60_000);

  it("a bare namespace prints its help on STDERR and exits 1 — the projection's arm, with the help row", () => {
    const { status, stdout, stderr } = run(["example"], freshCwd());
    expect(status).toBe(1);
    expect(stderr).toContain("Usage:");
    // The row exists ONLY because summon's host declares helpCommand(true) —
    // the projection's namespace action suppresses Commander's implicit one.
    expect(stderr).toContain("help [command]");
    expect(stdout).toBe("");
  }, 60_000);
});

describe("the designed excess-positional error", () => {
  it("a stray operand errors with the designed message, exit 2, nothing written", () => {
    const cwd = freshCwd();
    const { status, stderr } = run(["example", "hello", "stray", "--yes"], cwd);
    expect(status).toBe(2);
    expect(stderr).toContain('error: unexpected argument "stray"');
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);
});
