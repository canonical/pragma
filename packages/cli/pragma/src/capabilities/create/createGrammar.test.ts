/**
 * The mounted create grammar, end to end on the REAL bin (subprocess — the
 * mount, the designed help, the R1 migration error, the excess guard and the
 * refusal all live across bin.ts + buildProgram + the mount, so in-process
 * slices would miss their composition), plus in-process pins for the
 * dispatchPrepared refusal cell and the wizard's explicit-answer seed.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GlobalFlags } from "../../kernel/runtime/types.js";
import { CREATE_SURFACE } from "./createSurface.generated.js";
import { explicitLeafAnswers, leafVerb, topicTree } from "./mount.js";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "../../..");
const pragmaBin = join(packageRoot, "src/bin.ts");
const freshCwd = (): string => mkdtempSync(join(tmpdir(), "pragma-grammar-"));

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};

/** Spawn the real bin non-interactively in a fresh, XDG-isolated cwd. */
function run(args: readonly string[]): {
  status: number | null;
  stdout: string;
  stderr: string;
  cwd: string;
} {
  const cwd = freshCwd();
  const result = spawnSync("bun", [pragmaBin, ...args], {
    cwd,
    encoding: "utf-8",
    input: "",
    env: {
      ...process.env,
      XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), "pragma-grammar-cfg-")),
      XDG_STATE_HOME: mkdtempSync(join(tmpdir(), "pragma-grammar-state-")),
      XDG_CACHE_HOME: mkdtempSync(join(tmpdir(), "pragma-grammar-cache-")),
    },
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    cwd,
  };
}

describe("the mounted create grammar (subprocess)", () => {
  it("bare `create` prints the topic tree and exits 0", () => {
    const { status, stdout } = run(["create"]);
    expect(status).toBe(0);
    expect(stdout).toContain("component");
    expect(stdout).toContain("react");
    expect(stdout).toContain("svelte");
    expect(stdout).toContain("lit");
    expect(stdout).toContain("package");
    expect(stdout).toContain("application");
    // Derived from the manifest: paths + descriptions.
    expect(stdout).toContain(
      CREATE_SURFACE["component/react"]?.description ?? "",
    );
  }, 60_000);

  it("`create --help` prints the same topic tree, exit 0", () => {
    const bare = run(["create"]);
    const help = run(["create", "--help"]);
    expect(help.status).toBe(0);
    // Same tree; Commander's help path appends one extra blank line.
    expect(help.stdout.trimEnd()).toBe(bare.stdout.trimEnd());
  }, 60_000);

  it("a bare namespace mirrors summon: Commander help on stderr, exit 1", () => {
    const { status, stdout, stderr } = run(["create", "component"]);
    expect(status).toBe(1);
    expect(stdout).toBe("");
    expect(stderr).toContain("Usage:");
    expect(stderr).toContain("react");
    expect(stderr).toContain("svelte");
    expect(stderr).toContain("lit");
  }, 60_000);

  it("R1: the old --framework grammar dies loudly, naming the new form", () => {
    // The FACTS repro, verbatim.
    const { status, stderr, cwd } = run([
      "create",
      "component",
      "src/components/X",
      "--framework",
      "react",
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain(
      "error: unknown option '--framework' — the framework is now a path segment: " +
        "`pragma create component <react|svelte|lit> [component-path]` (create mirrors summon).",
    );
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);

  it("an excess positional errors with the designed message, exit 2", () => {
    const { status, stderr, cwd } = run([
      "create",
      "component",
      "react",
      "MyComponent",
      "Extra",
      "--yes",
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain('error: unexpected argument "Extra"');
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);

  it("a sibling segment among the operands earns a did-you-mean", () => {
    const { status, stderr } = run([
      "create",
      "component",
      "react",
      "svelte",
      "X",
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain('error: unexpected argument "X"');
    expect(stderr).toContain("Did you mean 'pragma create component svelte'?");
  }, 60_000);

  it("an unknown segment beneath a namespace names itself, exit 2", () => {
    const { status, stderr } = run(["create", "component", "vue"]);
    expect(status).toBe(2);
    expect(stderr).toContain("error: unknown command 'vue'");
  }, 60_000);

  it("the confirm convention is summon's: --no-with-styles is accepted, --with-styles is not", () => {
    const accepted = run([
      "create",
      "component",
      "react",
      "src/components/W",
      "--no-with-styles",
      "--dry-run",
    ]);
    expect(accepted.status).toBe(0);
    expect(accepted.stdout).toContain("Dry run");
    expect(readdirSync(accepted.cwd)).toEqual([]);

    const rejected = run([
      "create",
      "component",
      "react",
      "src/components/W",
      "--with-styles",
      "--dry-run",
    ]);
    expect(rejected.status).toBe(2);
    expect(rejected.stderr).toContain("--with-styles");
  }, 60_000);

  it("row 6 on the wire: a bare non-TTY leaf refuses with the shared message, exit 2", () => {
    const { status, stderr, cwd } = run(["create", "component", "react"]);
    expect(status).toBe(2);
    expect(stderr).toContain(
      "Refusing to scaffold in a non-interactive run without complete input. " +
        "Pass --yes to accept defaults, --dry-run to preview, or provide every answer as a flag. " +
        "Missing: --component-path, --with-styles, --with-stories, --with-ssr-tests.",
    );
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);

  it("row 5 on the wire: a fully-explicit non-TTY leaf runs without --yes", () => {
    const { status, cwd } = run([
      "create",
      "component",
      "react",
      "src/components/Widget",
      "--no-with-styles",
      "--no-with-stories",
      "--no-with-ssr-tests",
    ]);
    expect(status).toBe(0);
    expect(readdirSync(join(cwd, "src/components/Widget"))).toContain(
      "Widget.tsx",
    );
  }, 60_000);

  it("the invalid-value cell echoes the offending value, exit 2", () => {
    const { status, stderr, cwd } = run([
      "create",
      "component",
      "react",
      "not-pascal",
      "--yes",
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain(
      'Invalid --component-path "not-pascal": ' +
        "Component name must be in PascalCase",
    );
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);
});

describe("the refusal cell through dispatchPrepared (in-process)", () => {
  afterEach(() => {
    process.exitCode = 0;
    vi.restoreAllMocks();
  });

  it("runCreate re-derives refuse and the kernel renders it, exit 2", async () => {
    const { dispatchPrepared } = await import(
      "../../kernel/project/cli/dispatch.js"
    );
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    await dispatchPrepared(
      leafVerb("component/react"),
      {},
      { dryRun: false, undo: false, yes: false },
      FLAGS,
    );
    const written = stderr.mock.calls.map((call) => String(call[0])).join("");
    expect(written).toContain("Refusing to scaffold in a non-interactive run");
    expect(written).toContain("Missing: --component-path");
    expect(process.exitCode).toBe(2);
  }, 60_000);
});

describe("the wizard's seed — explicit answers only", () => {
  const prompts = CREATE_SURFACE["component/react"]?.prompts ?? [];

  it("extracts ONLY explicit answers (defaults never leak into the seed)", () => {
    // The wizard cell asks pendingPrompts(prompts, explicit); the seed handed
    // to runCreate must therefore be the EXPLICIT set, not defaults.
    expect(
      explicitLeafAnswers(prompts, undefined, {
        withStyles: false,
        dryRun: false,
      }),
    ).toEqual({ withStyles: false });
    // A confirm equal to its default is NOT explicit (Commander reports
    // untouched --no- flags as true).
    expect(
      explicitLeafAnswers(prompts, undefined, { withStyles: true }),
    ).toEqual({});
  });

  it("the positional lands under its prompt name", () => {
    expect(explicitLeafAnswers(prompts, "src/components/X", {})).toEqual({
      componentPath: "src/components/X",
    });
  });

  it("the topic tree lists every declared path with its description", () => {
    const tree = topicTree("pragma");
    for (const [commandPath, surface] of Object.entries(CREATE_SURFACE)) {
      for (const segment of commandPath.split("/")) {
        expect(tree).toContain(segment);
      }
      expect(tree).toContain(surface.description);
    }
  });
});
