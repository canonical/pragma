/**
 * The mounted create grammar, end to end on the REAL bin (subprocess — the
 * mount, the designed help, the R1 migration error, the excess guard and the
 * refusal all live across bin.ts + buildProgram + the mount, so in-process
 * slices would miss their composition), plus in-process pins for the
 * dispatchPrepared refusal cell and the wizard's explicit-answer seed.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VERSION } from "../../constants.js";
import type { GlobalFlags } from "../../kernel/runtime/types.js";
import { CREATE_SURFACE } from "./createSurface.generated.js";
import {
  explicitLeafAnswers,
  leafVerb,
  resolveCreateMode,
  topicTree,
} from "./mount.js";

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

  // The projection's two usage errors were the LAST create failure class
  // still writing raw prose under an explicit machine format (round-1 M5
  // closed the refusal; unknown option/verb already enveloped). The host
  // writer reframes them under writeRefusal's exact condition — explicit
  // `--format json`/`--format llm` only — with bin.ts's code taxonomy:
  // unknown command → UNKNOWN_VERB, excess/usage → INVALID_INPUT — and
  // bin.ts's SHAPE: `message` is a single prefix-stripped line and the
  // did-you-mean is the covenant's `suggestions` field (the corrected
  // invocation), so one code serializes one way across the two tiers.
  it("the unknown-segment error envelopes under --format json — UNKNOWN_VERB with the suggestion in `suggestions`", () => {
    const { status, stderr, cwd } = run([
      "create",
      "component",
      "reakt",
      "--format",
      "json",
    ]);
    expect(status).toBe(2);
    const line = stderr
      .split("\n")
      .find((candidate) => candidate.startsWith("{"));
    expect(line, `no JSON envelope on stderr:\n${stderr}`).toBeDefined();
    const envelope = JSON.parse(line as string) as {
      ok: boolean;
      error: { code: string; message: string; suggestions?: string[] };
    };
    expect(envelope.ok).toBe(false);
    expect(envelope.error.code).toBe("UNKNOWN_VERB");
    // SINGLE line — an agent rendering `message` never meets an embedded
    // newline, and the structured match sits where every other pragma
    // fuzzy-match error puts it.
    expect(envelope.error.message).toBe("unknown command 'reakt'");
    expect(envelope.error.suggestions).toEqual([
      "pragma create component react",
    ]);
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);

  it("the excess-positional error envelopes under --format json — INVALID_INPUT, never raw prose", () => {
    const { status, stderr, cwd } = run([
      "create",
      "component",
      "react",
      "MyComponent",
      "Extra",
      "--format",
      "json",
    ]);
    expect(status).toBe(2);
    const line = stderr
      .split("\n")
      .find((candidate) => candidate.startsWith("{"));
    expect(line, `no JSON envelope on stderr:\n${stderr}`).toBeDefined();
    const envelope = JSON.parse(line as string) as {
      ok: boolean;
      error: { code: string; message: string; suggestions?: string[] };
    };
    expect(envelope.ok).toBe(false);
    expect(envelope.error.code).toBe("INVALID_INPUT");
    expect(envelope.error.message).toBe('unexpected argument "Extra"');
    // No operand matched a segment: no suggestion, so the optional field is
    // OMITTED — exactly as the kernel tier serializes an empty match list.
    expect(envelope.error.suggestions).toBeUndefined();
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);

  it("bin-tier usage errors envelope under --format llm too — one gate for the whole class (kernel-wide)", () => {
    // Before the hoist the machine-format decision existed as four copies
    // under TWO gates: bin.ts's two sites enveloped on json ONLY, so under
    // --format llm an excess positional enveloped while an unknown option
    // and the --framework migration error stayed raw prose — one taxonomy
    // class, split. All four sites now share renderErrorForFormat.
    const bogus = run(["create", "package", "--bogus", "--format", "llm"]);
    expect(bogus.status).toBe(2);
    expect(bogus.stderr).toContain("## Error: INVALID_INPUT");
    expect(bogus.stderr).toContain("unknown option '--bogus'");

    const framework = run([
      "create",
      "component",
      "src/components/X",
      "--framework",
      "react",
      "--format",
      "llm",
    ]);
    expect(framework.status).toBe(2);
    expect(framework.stderr).toContain("## Error: INVALID_INPUT");
    expect(framework.stderr).toContain("the framework is now a path segment");
  }, 60_000);

  it("the unknown-segment error under --format llm carries the condensed framing with a Suggestions line", () => {
    const { status, stderr } = run([
      "create",
      "component",
      "reakt",
      "--format",
      "llm",
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain("## Error: UNKNOWN_VERB");
    expect(stderr).toContain("unknown command 'reakt'");
    // The renderer's own Suggestions row — not a third prose line.
    expect(stderr).toContain("Suggestions: pragma create component react");
    expect(stderr).not.toContain("Did you mean");
  }, 60_000);

  it("DEFAULT piped output for both projection usage errors stays the raw prose — full stderr, no envelope", () => {
    // Full-stderr byte-equality needs a quiet stream: seed the global config
    // so the one-time first-run note (stderr by design) does not fire.
    const configHome = mkdtempSync(join(tmpdir(), "pragma-grammar-cfg-"));
    mkdirSync(join(configHome, "pragma"));
    writeFileSync(join(configHome, "pragma", "config.json"), "{}\n");
    const spawn = (args: readonly string[]) =>
      spawnSync("bun", [pragmaBin, ...args], {
        cwd: freshCwd(),
        encoding: "utf-8",
        input: "",
        env: {
          ...process.env,
          XDG_CONFIG_HOME: configHome,
          XDG_STATE_HOME: mkdtempSync(join(tmpdir(), "pragma-grammar-state-")),
          XDG_CACHE_HOME: mkdtempSync(join(tmpdir(), "pragma-grammar-cache-")),
        },
      });
    const segment = spawn(["create", "component", "reakt"]);
    expect(segment.status).toBe(2);
    expect(segment.stderr).toBe(
      "error: unknown command 'reakt'\n" +
        "Did you mean 'pragma create component react'?\n",
    );
    const excess = spawn(["create", "component", "react", "MyComponent", "X"]);
    expect(excess.status).toBe(2);
    expect(excess.stderr).toBe('error: unexpected argument "X"\n');
  }, 60_000);

  it("`-v` COLLIDES with pragma's global --version — the version prints, exit 0, nothing written (§2)", () => {
    // summon's `-v` is `--verbose` (the run proceeds); pragma's whole-argv
    // global scan makes the same token print the VERSION and scaffold
    // nothing — no unknown-option error, unlike -d/-y/-l. §2 documents the
    // collision; this cell keeps the divergence deliberate, not accidental
    // (pragma's global -v is covenant-frozen surface, out of CIS scope).
    const { status, stdout, stderr, cwd } = run([
      "create",
      "component",
      "react",
      "src/components/X",
      "-v",
      "--yes",
    ]);
    expect(status).toBe(0);
    expect(stdout).toBe(`${VERSION}\n`);
    // The scan exits before first-run onboarding: a clean stderr too.
    expect(stderr).toBe("");
    expect(readdirSync(cwd)).toEqual([]);
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

  it("the refusal envelopes under --format json (D3) — never raw prose on a machine stream", () => {
    const { status, stderr, cwd } = run([
      "create",
      "component",
      "react",
      "--format",
      "json",
    ]);
    expect(status).toBe(2);
    // The one JSON line is the same {ok:false, error} envelope every other
    // pragma error emits; the shared refusal text rides inside it.
    const line = stderr
      .split("\n")
      .find((candidate) => candidate.startsWith("{"));
    expect(line, `no JSON envelope on stderr:\n${stderr}`).toBeDefined();
    const envelope = JSON.parse(line as string) as {
      ok: boolean;
      error: { code: string; message: string };
    };
    expect(envelope.ok).toBe(false);
    expect(envelope.error.code).toBe("INVALID_INPUT");
    expect(envelope.error.message).toContain(
      "Refusing to scaffold in a non-interactive run without complete input.",
    );
    expect(envelope.error.message).toContain("Missing: --component-path");
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);

  it("the refusal envelopes under an explicit --format llm — the condensed D3 error form", () => {
    const { status, stderr, cwd } = run([
      "create",
      "component",
      "react",
      "--format",
      "llm",
    ]);
    expect(status).toBe(2);
    // The same `## Error: <code>` framing every other pragma error carries in
    // llm form, with the shared refusal line riding beneath it.
    expect(stderr).toContain("## Error: INVALID_INPUT");
    expect(stderr).toContain(
      "Refusing to scaffold in a non-interactive run without complete input.",
    );
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);

  it("a DEFAULT piped refusal is the bare shared line — no envelope; auto-LLM never reframes it", () => {
    // Full-stderr byte-equality needs a quiet stream: seed the global config
    // so the one-time first-run note (stderr by design) does not fire.
    const configHome = mkdtempSync(join(tmpdir(), "pragma-grammar-cfg-"));
    mkdirSync(join(configHome, "pragma"));
    writeFileSync(join(configHome, "pragma", "config.json"), "{}\n");
    const cwd = freshCwd();
    const result = spawnSync(
      "bun",
      [pragmaBin, "create", "component", "react"],
      {
        cwd,
        encoding: "utf-8",
        input: "",
        env: {
          ...process.env,
          XDG_CONFIG_HOME: configHome,
          XDG_STATE_HOME: mkdtempSync(join(tmpdir(), "pragma-grammar-state-")),
          XDG_CACHE_HOME: mkdtempSync(join(tmpdir(), "pragma-grammar-cache-")),
        },
      },
    );
    expect(result.status).toBe(2);
    // Byte-equality of the WHOLE stream with the shared message (contract §3):
    // the parity surface summon writes verbatim, with no framing line above it.
    expect(result.stderr).toBe(
      "Refusing to scaffold in a non-interactive run without complete input. " +
        "Pass --yes to accept defaults, --dry-run to preview, or provide every answer as a flag. " +
        "Missing: --component-path, --with-styles, --with-stories, --with-ssr-tests.\n",
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

describe("the mount's mode resolution — TTY driven through the seam", () => {
  // No suite can hand a subprocess a real TTY, so the §L rows that depend on
  // isTTY: true are pinned HERE, through the exported resolver the action
  // itself calls (with cliIsTTY()). The OLD decision block routed TTY
  // dry-run/undo into Ink; these rows keep that from silently returning.
  const prompts = CREATE_SURFACE["component/react"]?.prompts ?? [];
  const flags = (dryRun: boolean, undo: boolean, yes: boolean) => ({
    dryRun,
    undo,
    yes,
  });

  it("TTY --dry-run resolves batch-dry-run — never an interactive preview", () => {
    expect(
      resolveCreateMode(prompts, {}, flags(true, false, false), true),
    ).toBe("batch-dry-run");
  });

  it("TTY --undo resolves batch-undo — never a prompting wizard", () => {
    expect(
      resolveCreateMode(prompts, {}, flags(false, true, false), true),
    ).toBe("batch-undo");
  });

  it("TTY --dry-run outranks --undo (the shared precedence)", () => {
    expect(resolveCreateMode(prompts, {}, flags(true, true, false), true)).toBe(
      "batch-dry-run",
    );
  });

  it("a bare TTY leaf resolves wizard; the same input without a TTY refuses", () => {
    expect(
      resolveCreateMode(prompts, {}, flags(false, false, false), true),
    ).toBe("wizard");
    expect(
      resolveCreateMode(prompts, {}, flags(false, false, false), false),
    ).toBe("refuse");
  });
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
