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
