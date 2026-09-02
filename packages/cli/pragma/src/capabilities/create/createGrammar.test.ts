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
import {
  buildOptionInfo,
  missingExplicitFlags,
} from "@canonical/summon-core/projection";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RECOVERY_CLI_PREFIX, VERSION } from "../../constants.js";
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

  it("R1 stays scoped: `create package --framework` is that leaf's OWN flag", () => {
    // The retired-grammar message belongs to `create component`, whose
    // framework became a path segment. `create package` speaks a different
    // grammar in which `--framework` is a real select, so it must be parsed,
    // never met with a migration message about a form it never spoke.
    const { status, stderr } = run([
      "create",
      "package",
      "--framework",
      "svelte",
    ]);
    // Still a refusal — the OTHER answers are missing — but not about this
    // flag: it parsed, so it is absent from the Missing list.
    expect(status).toBe(2);
    expect(stderr).not.toContain("unknown option '--framework'");
    expect(stderr).not.toContain("the framework is now a path segment");
    expect(/Missing: ([^\n]*)\./.exec(stderr)?.[1]).not.toContain(
      "--framework",
    );
  }, 60_000);

  it("R1 stops at the terminator: `--framework` after `--` is an operand, not the retired flag", () => {
    // The retired-grammar scan must read only the pre-`--` span: here the
    // parse failure is the unknown option BEFORE the terminator, and the
    // `--framework` after it is user data — the honest error must stand
    // instead of a migration message about a flag that was never passed.
    const { status, stderr } = run([
      "create",
      "component",
      "react",
      "--bogus",
      "--",
      "--framework",
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain("unknown option '--bogus'");
    expect(stderr).not.toContain("the framework is now a path segment");
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
  // unknown command → UNKNOWN_VERB, excess/usage → INVALID_INPUT — and a
  // single prefix-stripped `message` line. The match serializes PER KIND:
  // an unknown segment is a FUZZY match, so its bare candidate rides in
  // `suggestions` (substitutable for the token the message names —
  // ErrorPayload.suggestions' convention, matching bin.ts's UNKNOWN_VERB
  // tier); an excess positional's match is NOT substitutable (it may BE
  // the stray its own message calls unexpected), so that kind omits
  // `suggestions` and carries the runnable correction as `recovery.cli` —
  // the same command the DEFAULT prose did-you-mean line names.
  it("the unknown-segment error envelopes under --format json — UNKNOWN_VERB with the bare segment in `suggestions`", () => {
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
    // fuzzy-match error puts it, in the field's convention: the bare
    // candidate token, exactly as `pragma blok --format json` serializes.
    expect(envelope.error.message).toBe("unknown command 'reakt'");
    expect(envelope.error.suggestions).toEqual(["react"]);
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);

  it("the excess-positional error envelopes under --format json — INVALID_INPUT, recovery.cli carrying the correction", () => {
    /** Parse the one JSON line an envelope-writing spawn leaves on stderr. */
    const envelopeOf = (stderr: string) => {
      const line = stderr
        .split("\n")
        .find((candidate) => candidate.startsWith("{"));
      expect(line, `no JSON envelope on stderr:\n${stderr}`).toBeDefined();
      return JSON.parse(line as string) as {
        ok: boolean;
        error: {
          code: string;
          message: string;
          suggestions?: string[];
          recovery?: { message: string; cli?: string };
        };
      };
    };

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
    const envelope = envelopeOf(stderr);
    expect(envelope.ok).toBe(false);
    expect(envelope.error.code).toBe("INVALID_INPUT");
    expect(envelope.error.message).toBe('unexpected argument "Extra"');
    // No operand matched a segment: nothing runnable exists, so BOTH
    // optional fields are OMITTED — exactly as serializeError drops every
    // empty optional.
    expect(envelope.error.suggestions).toBeUndefined();
    expect(envelope.error.recovery).toBeUndefined();
    expect(readdirSync(cwd)).toEqual([]);

    // WITH a match the correction is STRUCTURAL, never a substitution: in
    // `react MyThing svelte` the matched operand (`svelte`) IS the token
    // the message calls unexpected — a `suggestions` entry here told an
    // agent to substitute `svelte` for `svelte` and retry the same argv
    // (round-11 F2, found by four reviewers). The kind omits `suggestions`
    // and carries the runnable command in the covenant's `recovery.cli` —
    // byte-for-byte the command the default prose did-you-mean names.
    const matched = run([
      "create",
      "component",
      "react",
      "MyThing",
      "svelte",
      "--format",
      "json",
    ]);
    expect(matched.status).toBe(2);
    const matchedEnvelope = envelopeOf(matched.stderr);
    expect(matchedEnvelope.error.code).toBe("INVALID_INPUT");
    expect(matchedEnvelope.error.message).toBe('unexpected argument "svelte"');
    expect(matchedEnvelope.error.suggestions).toBeUndefined();
    // D5's third route, pinned as the INVARIANT and not only the output:
    // this cli is COMPUTED at the mount (chain[0] = the root program's
    // name), bypassing cliRecovery and invisible to copy.test.ts's
    // quoted-literal position rule — so the expectation is COMPOSED from
    // the same constant the derivation must land on. A `startsWith` check
    // behind an exact literal could never fail (the literal throws first
    // on every divergence); composing the ONE expectation makes a
    // root-program rename redden this cell naming RECOVERY_CLI_PREFIX,
    // not a stale-looking literal a maintainer would just update.
    expect(matchedEnvelope.error.recovery).toEqual({
      message: "Run the corrected invocation.",
      cli: `${RECOVERY_CLI_PREFIX}create component svelte`,
    });

    // The stray≠suggestion shape — `react svelte X` binds `svelte` as the
    // positional and overflows `X` — carries the SAME correction while its
    // message names an operand the correction never mentions: the shape
    // that made a bare `suggestions` token unactionable.
    const crossed = run([
      "create",
      "component",
      "react",
      "svelte",
      "X",
      "--format",
      "json",
    ]);
    expect(crossed.status).toBe(2);
    const crossedEnvelope = envelopeOf(crossed.stderr);
    expect(crossedEnvelope.error.code).toBe("INVALID_INPUT");
    expect(crossedEnvelope.error.message).toBe('unexpected argument "X"');
    expect(crossedEnvelope.error.suggestions).toBeUndefined();
    expect(crossedEnvelope.error.recovery).toEqual({
      message: "Run the corrected invocation.",
      cli: `${RECOVERY_CLI_PREFIX}create component svelte`,
    });
  }, 60_000);

  it("the excess-positional recovery renders under --format llm through the renderer's own Recovery row", () => {
    const { status, stderr } = run([
      "create",
      "component",
      "react",
      "MyThing",
      "svelte",
      "--format",
      "llm",
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain("## Error: INVALID_INPUT");
    expect(stderr).toContain('unexpected argument "svelte"');
    // renderErrorLlm's existing recovery framing — no Suggestions row for
    // this kind, and no bespoke framing invented for it.
    expect(stderr).toContain(
      "Recovery: Run the corrected invocation. `pragma create component svelte`",
    );
    expect(stderr).not.toContain("Suggestions:");
    expect(stderr).not.toContain("Did you mean");
  }, 60_000);

  it("a NAMESPACE match ships no recovery — `package`'s only siblings cannot scaffold, so the covenant's run-to-recover field never names one", () => {
    // The one declared leaf whose siblings are namespaces: from `package`,
    // a matched operand can only be `component`/`application` — and a bare
    // namespace exits 1 with a help page in every format (§2), so a
    // recovery.cli naming it told an agent to "run" a command that cannot
    // scaffold (pre-gate this envelope carried
    // cli: "pragma create component"; measured red before the fix). The
    // mount's runnability gate (CREATE_SURFACE lookup) drops the recovery;
    // like the no-match arm, the envelope then carries NEITHER optional
    // field.
    const { status, stderr, cwd } = run([
      "create",
      "package",
      "component",
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
      error: {
        code: string;
        message: string;
        suggestions?: string[];
        recovery?: unknown;
      };
    };
    expect(envelope.ok).toBe(false);
    expect(envelope.error.code).toBe("INVALID_INPUT");
    expect(envelope.error.message).toBe('unexpected argument "component"');
    expect(envelope.error.suggestions).toBeUndefined();
    expect(envelope.error.recovery).toBeUndefined();
    expect(readdirSync(cwd)).toEqual([]);

    // The DEFAULT prose keeps the navigation hint unchanged: an
    // interrogative did-you-mean pointing at the namespace is fine — the
    // delta was only ever the machine-format imperative.
    const prose = run(["create", "package", "component"]);
    expect(prose.status).toBe(2);
    expect(prose.stderr).toContain('error: unexpected argument "component"');
    expect(prose.stderr).toContain("Did you mean 'pragma create component'?");
    expect(readdirSync(prose.cwd)).toEqual([]);
  }, 60_000);

  it("bin-tier usage errors envelope under --format llm too — the unknown option and the --framework migration error", () => {
    // Before the hoist the machine-format decision existed as four copies
    // under TWO gates: bin.ts's two sites enveloped on json ONLY, so under
    // --format llm an excess positional enveloped while an unknown option
    // and the --framework migration error stayed raw prose — one taxonomy
    // class, split. All five usage-error sites (these two, the
    // unknown-command arm, and the projection writer's two classes) now
    // share renderErrorForFormat; the unknown-command member is pinned by
    // its own cells below.
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
    // The renderer's own Suggestions row — not a third prose line — with
    // the bare candidate segment, the field's one convention.
    expect(stderr).toContain("Suggestions: react");
    expect(stderr).not.toContain("Did you mean");
  }, 60_000);

  it("the bin-tier unknown command envelopes under --format llm — UNKNOWN_VERB with bare-token suggestions", () => {
    // The unknown-command arm was the last handleProgramError site off
    // renderErrorForFormat: under an explicit --format llm a typo'd verb
    // (`pragma blok`) rendered the plain prose while its create-tier
    // sibling (`create component reakt`) enveloped — one code, two gates.
    const { status, stderr } = run(["blok", "--format", "llm"]);
    expect(status).toBe(2);
    expect(stderr).toContain("## Error: UNKNOWN_VERB");
    expect(stderr).toContain('Unknown command "blok".');
    expect(stderr).toContain("Suggestions: block");
    expect(stderr).not.toContain("Did you mean");
  }, 60_000);

  it("the bin-tier unknown command envelopes under --format json — bare-token suggestions, byte-stable", () => {
    const { status, stderr } = run(["blok", "--format", "json"]);
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
    expect(envelope.error.message).toBe('Unknown command "blok".');
    // The bare candidate token — the same convention the create tier's
    // envelope carries, so one code has one `suggestions` shape.
    expect(envelope.error.suggestions).toEqual(["block"]);
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

  it("`-v` is an unknown option in the subtree — exit 2, nothing written (§2)", () => {
    // summon's `-v` is `--verbose` (its run proceeds); pragma has no short
    // flags at all — one spelling per flag — so the token reaches the
    // subtree and fails as an ordinary unknown option instead of silently
    // meaning something else. This cell keeps the divergence deliberate,
    // not accidental (the host flag surface is bin.ts's — out of CIS scope;
    // the covenant freezes neither token).
    const { status, stdout, stderr, cwd } = run([
      "create",
      "component",
      "react",
      "src/components/X",
      "-v",
      "--yes",
    ]);
    expect(status).toBe(2);
    expect(stdout).toBe("");
    expect(stderr).toContain("error: unknown option '-v'");
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
    expect(accepted.stdout).toContain("Dry-run complete.");
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
        "Missing: --component-path, --no-with-styles, --no-with-stories, --no-with-ssr-tests.",
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
        "Missing: --component-path, --no-with-styles, --no-with-stories, --no-with-ssr-tests.\n",
    );
    expect(readdirSync(cwd)).toEqual([]);
  }, 60_000);

  // The refusal's own instruction WORKS — on EVERY declared leaf. Take the
  // message's advice VERBATIM: extract the tokens the bare refusal prints,
  // supply each back (a valid value where the registered form takes one, the
  // `--no-` confirms bare), add --dry-run, and the same leaf must preview
  // cleanly and write nothing. Round 14 proved the tokens PARSE; this closes
  // the round trip: a leaf may not advertise a completion its own generator
  // then rejects — `application/react` did exactly that (its Missing list
  // named `--no-ssr, --no-router` and its guard refused precisely those two,
  // a two-state loop with no all-flags exit) until the dead prompt pair was
  // removed. Pre-round-14 the list kebab-cased prompt NAMES (`--with-styles`
  // and friends, which no host registers), so the round-trip was `error:
  // unknown option` — this cell reddens on either regression.
  const REPLY_VALUES: Record<string, Record<string, string>> = {
    "component/react": { "--component-path": "src/components/Replied" },
    "component/svelte": { "--component-path": "src/lib/Replied" },
    "component/lit": { "--component-path": "src/lib/Replied" },
    package: {
      "--name": "@canonical/replied-lib",
      "--type": "library",
      "--description": "A replied library.",
      "--framework": "none",
    },
    "application/react": {
      "--app-path": "replied-app",
      "--rendering": "spa",
    },
  };
  for (const [commandPath, surface] of Object.entries(CREATE_SURFACE)) {
    it(`${commandPath}: the refusal's own instruction WORKS — its Missing tokens supplied back (+ --dry-run) preview, exit 0`, () => {
      const path = commandPath.split("/");
      const refusal = run(["create", ...path]);
      expect(refusal.status).toBe(2);
      const missing = /Missing: ([^\n]*)\./.exec(refusal.stderr);
      expect(missing, `no Missing list in:\n${refusal.stderr}`).not.toBeNull();
      const tokens = (missing as RegExpExecArray)[1]?.split(", ") ?? [];
      // The live list IS the derivation — parsed off the wire, tied to the
      // same authority the mount registers from (non-empty by declaration).
      expect(tokens).toEqual(missingExplicitFlags(surface.prompts, {}));
      expect(tokens.length).toBeGreaterThan(0);
      // A token whose registered form takes a value gets a valid one from
      // the table above — fail loudly on a leaf the table does not know.
      const takesValue = new Map(
        surface.prompts.map((prompt) => {
          const info = buildOptionInfo(prompt);
          return [info.flags.split(" ")[0], info.flags.includes(" ")] as const;
        }),
      );
      const supplied = tokens.flatMap((token) => {
        if (!takesValue.get(token)) return [token];
        const value = REPLY_VALUES[commandPath]?.[token];
        if (value === undefined) {
          throw new Error(`no reply value for ${token} on ${commandPath}`);
        }
        return [token, value];
      });
      const replied = run(["create", ...path, ...supplied, "--dry-run"]);
      expect(replied.stderr).not.toContain("unknown option");
      expect(replied.status, replied.stderr).toBe(0);
      expect(replied.stdout).toContain("Dry-run complete.");
      expect(readdirSync(replied.cwd)).toEqual([]);
    }, 60_000);
  }
  // The react list stays pinned at its exact bytes (the round-14 literal):
  // the loop above ties every leaf to the derivation; this cell keeps one
  // wire literal a derivation bug cannot move silently.
  it("component/react's Missing list is the exact four registered tokens", () => {
    const refusal = run(["create", "component", "react"]);
    const missing = /Missing: ([^\n]*)\./.exec(refusal.stderr);
    expect((missing as RegExpExecArray)[1]?.split(", ")).toEqual([
      "--component-path",
      "--no-with-styles",
      "--no-with-stories",
      "--no-with-ssr-tests",
    ]);
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
  // itself calls (with canPrompt()). The OLD decision block routed TTY
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

describe("the refusal's Missing tokens are REGISTERED flags — every declared leaf", () => {
  // The round-14 defect: kebab-casing prompt NAMES advertised 13 of the 25
  // tokens across the five leaves under spellings NO host registers (a
  // default-true confirm registers ONLY `--no-<kebab>`), so following the
  // refusal's own instruction exited 2. The pin: for every declared leaf,
  // the bare-invocation Missing list ⊆ the long-flag set the single
  // flag-shape authority yields for that leaf's prompts.
  for (const [commandPath, surface] of Object.entries(CREATE_SURFACE)) {
    it(`${commandPath}: missingExplicitFlags({}) names only buildOptionInfo's registered long forms`, () => {
      const registered = surface.prompts.map(
        (prompt) => buildOptionInfo(prompt).flags.split(" ")[0],
      );
      const missing = missingExplicitFlags(surface.prompts, {});
      // Every declared leaf has at least one unconditional prompt, so an
      // empty list can never green this pin vacuously.
      expect(missing.length).toBeGreaterThan(0);
      for (const token of missing) {
        expect(registered).toContain(token);
      }
    });
  }
});
