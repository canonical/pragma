import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import { BIN_NAME } from "../../constants.js";
import { completionFixture } from "../../testing/fixtures/completionFixture.js";
import { emitScripts } from "./emitScripts.js";

/**
 * Drive the GENERATED completion scripts in real bash, zsh and fish.
 *
 * Every other test in this directory stops at the boundary of the script's
 * text: `emitScripts.test.ts` snapshots it, `safety.test.ts` asserts what its
 * characters may not be, `parse.test.ts` pins what the resolver does with
 * words. Nothing executes it. A script that emits but does not parse leaves
 * `_pragma` undefined and TAB silently dead forever, and a script that frames
 * the delegation wrongly hands `__complete` the wrong slot while every unit
 * test stays green. Both are only observable by running the thing.
 *
 * So this file runs it — over BOTH grammars:
 *
 * - the FIXTURE grammar, for the M1 `--flag=value` wordbreak regression (with
 *   `=` in `COMP_WORDBREAKS`, bash splits `--format=` into `--format` `=` ``;
 *   without the normalization at the top of `_pragma` the value slot falls
 *   through to the noun/positional arm and offers the WRONG candidates);
 * - the LIVE grammar (`emitScripts(capabilities)`), which is the script users
 *   actually install and which no test had ever executed.
 *
 * Each driver puts a stand-in for the bin first on the child's `PATH`, which
 * both RECORDS the argv it was handed and ANSWERS with two candidates, so every
 * candidate set comes with the exec log that produced it and every exec can be
 * followed to what the user is offered. That turns `emitScripts.ts`'s docblock
 * claim — "the static tier answers STRUCTURE with zero exec; only
 * `{kind:"names"}` value contexts shell out" — into an assertion, pins the exact
 * argv the scripts hand `<bin> __complete`, and pins the last mile back.
 * Standing first on `PATH` also means a developer with a real `pragma`
 * installed can never have it exec'd by this suite.
 *
 * WHAT IS PROVEN, AND WHERE — this split must not be blurred:
 *
 * - **By execution on every machine that runs the suite:** bash parses both
 *   scripts; the live bash script offers the live grammar's structure with
 *   zero process exec; it hands `__complete` a literal argv and offers back
 *   what it answers; it honours the `minChars` gate.
 * - **By execution only where the shell is installed:** the same guarantees
 *   for zsh and fish. Those describes `skipIf` the shell is absent, which
 *   includes this development box and, today, CI — so on those machines they
 *   assert NOTHING, and say so by skipping visibly. Every assertion in them
 *   was executed during development against zsh 5.9 and fish 3.7.0 (obtained
 *   with `apt-get download zsh zsh-common fish fish-common` + `dpkg-deb -x`
 *   into a scratch prefix, leaving the box itself untouched). Adding
 *   `zsh fish` to CI's apt step is what would make them continuous.
 * - **By static assertion only, everywhere:** that the zsh and fish scripts
 *   contain no `eval`, no backticks, guarded `compadd`, inert value lists and
 *   the exact delegation form — `safety.test.ts`'s script-safety describe. A
 *   static assertion is never an execution proof, and no name in this file
 *   claims one.
 */

/** Whether a shell of this id is on PATH and runnable. */
function hasShell(id: string): boolean {
  return (
    spawnSync(id, ["-c", "printf ok"], { encoding: "utf-8" }).stdout === "ok"
  );
}

/** The scripts for the fixture grammar (which has the global --format). */
const fixture = emitScripts([completionFixture]);
/** The scripts a user actually installs, for the LIVE grammar. */
const live = emitScripts(capabilities);

/** The frame separating one recorded exec from the next in the record file. */
const CALL = "<<<CALL>>>";

/**
 * The two candidates the stub answers a delegation with, derived from the
 * partial it was handed — the shape a real `__complete` reply has (every
 * candidate extends the typed partial), which is what fish's engine filters on.
 */
function answersFor(partial: string): string[] {
  return [`${partial}-one`, `${partial}-two`];
}

/**
 * A directory holding a stub named after the bin: a bash script that appends a
 * framed copy of its own argv to `$RECORD` and answers with
 * {@link answersFor}'s two candidates. Placed FIRST on each child's PATH by the
 * drivers below.
 *
 * It ANSWERS as well as records because recording alone stops one step short of
 * the guarantee: a script can exec `__complete` with a perfect argv and then
 * drop every line it gets back, leaving TAB silently dead. Measured — with
 * `COMPREPLY=()` appended to bash's dynamic function and `_matches=()` before
 * zsh's `compadd`, entity completion offers nothing in either shell and 258
 * tests across this directory, `setup`, `doctor` and the behavioural suite
 * still passed. The reply assertions below are what fails now.
 */
const stubDir = mkdtempSync(join(tmpdir(), "pragma-drive-stub-"));
writeFileSync(
  join(stubDir, BIN_NAME),
  `#!/usr/bin/env bash\n{ printf '${CALL}\\n'; printf '%s\\n' "$@"; } >> "$RECORD"\nprintf '%s\\n' "\${@: -1}-one" "\${@: -1}-two"\n`,
);
chmodSync(join(stubDir, BIN_NAME), 0o755);

/** What one drive observed: the offered candidates and the execs it caused. */
interface Drive {
  /** The candidates the shell was offered, line by line. */
  readonly reply: string[];
  /** One entry per exec of the recorder, each the full argv it received. */
  readonly calls: string[][];
}

/** Split the recorder's log into one argv array per framed call. */
function parseCalls(record: string): string[][] {
  return record
    .split(`${CALL}\n`)
    .slice(1)
    .map((chunk) => chunk.split("\n").slice(0, -1));
}

/** A scratch dir holding a script file, a driver path and a fresh record. */
function scratch(script: string): {
  file: string;
  driver: string;
  record: string;
} {
  const dir = mkdtempSync(join(tmpdir(), "pragma-shelldrive-"));
  const file = join(dir, "completion");
  const record = join(dir, "record");
  writeFileSync(file, script);
  writeFileSync(record, "");
  return { file, driver: join(dir, "driver"), record };
}

/**
 * The child environment: the recorder first, then the REAL bin dirs. Node
 * resolves the spawned command through the CHILD's `PATH`, so a stub-only
 * `PATH` cannot find the shell itself.
 */
function childEnv(record: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${stubDir}:${process.env.PATH ?? ""}`,
    RECORD: record,
  };
}

/** Non-empty stdout lines. */
function lines(stdout: string): string[] {
  return stdout.split("\n").filter((line) => line.length > 0);
}

/**
 * Source a generated bash script, place the cursor per COMP_WORDS/COMP_CWORD,
 * invoke `_pragma`, and report COMPREPLY plus every exec the script performed.
 */
function driveBash(
  script: string,
  words: readonly string[],
  cword: number,
): Drive {
  const { file, record } = scratch(script);
  const wordsLiteral = words
    .map((word) => `'${word.replace(/'/g, "'\\''")}'`)
    .join(" ");
  const source = [
    `source '${file}'`,
    `COMP_WORDS=(${wordsLiteral})`,
    `COMP_CWORD=${cword}`,
    `_${BIN_NAME}`,
    `printf '%s\\n' "\${COMPREPLY[@]}"`,
  ].join("\n");
  const result = spawnSync("bash", ["--norc", "--noprofile", "-c", source], {
    encoding: "utf-8",
    env: childEnv(record),
  });
  return {
    reply: lines(result.stdout),
    calls: parseCalls(readFileSync(record, "utf-8")),
  };
}

/**
 * Source a generated zsh script with `words` + `CURRENT` set as zsh's
 * completion system would, and report what it `compadd`s.
 *
 * `CURRENT` is bash's `COMP_CWORD` PLUS ONE — zsh indexes `words` from 1. The
 * script ends in `_pragma "$@"`, which runs it, so the driver must not call it
 * again or every candidate is offered twice. `compadd` and `_files` are stubbed
 * because a `-f` zsh has no completion system loaded; the stub drops the `--`
 * guard the templates emit exactly as the real `compadd` would.
 */
function driveZsh(
  script: string,
  words: readonly string[],
  cword: number,
): Drive {
  const { file, driver, record } = scratch(script);
  writeFileSync(
    driver,
    [
      "local -a words",
      'words=("$@")',
      `CURRENT=${cword + 1}`,
      'compadd() { local a; for a in "$@"; do [[ $a == -- ]] || print -r -- "$a"; done }',
      "_files() { : }",
      `source '${file}'`,
      "",
    ].join("\n"),
  );
  const result = spawnSync("zsh", ["-f", driver, ...words], {
    encoding: "utf-8",
    env: childEnv(record),
  });
  return {
    reply: lines(result.stdout),
    calls: parseCalls(readFileSync(record, "utf-8")),
  };
}

/**
 * Source a generated fish script and ask fish itself to complete a command
 * line, via its first-class `complete -C`. The highest-fidelity of the three
 * drivers: fish's own engine does the position matching and the filtering.
 */
function driveFish(script: string, line: string): Drive {
  const { file, record } = scratch(script);
  const result = spawnSync(
    "fish",
    ["--no-config", "-c", "source $argv[1]; complete -C $argv[2]", file, line],
    { encoding: "utf-8", env: childEnv(record) },
  );
  return {
    reply: lines(result.stdout),
    calls: parseCalls(readFileSync(record, "utf-8")),
  };
}

/** `<shell> -n <file>`: does the shell accept this text as a script at all? */
function parses(shell: string, script: string): number | null {
  const { file } = scratch(script);
  return spawnSync(shell, ["-n", file], { encoding: "utf-8" }).status;
}

/** The argv the protocol pins for `pragma block lookup ds:global.component.but`. */
const PROTOCOL_ARGV = [
  "__complete",
  "--",
  "block",
  "lookup",
  "ds:global.component.but",
];

describe.skipIf(!hasShell("bash"))(
  "generated bash — --flag=value wordbreak (M1)",
  () => {
    it("routes --format=<TAB> to the format values (not nouns/positionals)", () => {
      // Default COMP_WORDBREAKS split: `--format` `=` `` (empty current word).
      const { reply } = driveBash(
        fixture.bash,
        ["pragma", "--format", "=", ""],
        3,
      );
      expect(reply.sort()).toEqual(["json", "llm", "plain"]);
    });

    it("filters the value by the partial typed after =", () => {
      const { reply } = driveBash(
        fixture.bash,
        ["pragma", "--format", "=", "j"],
        3,
      );
      expect(reply).toEqual(["json"]);
    });

    it("routes a verb-scoped --format=<TAB> the same way", () => {
      // After a noun/verb the value must still route as a flag value, never as
      // block's positional (which would offer entity/enum candidates instead).
      const { reply } = driveBash(
        fixture.bash,
        ["pragma", "block", "get", "--format", "=", ""],
        5,
      );
      expect(reply.sort()).toEqual(["json", "llm", "plain"]);
    });

    it("still completes the space form --format <TAB> (unbroken)", () => {
      const { reply } = driveBash(fixture.bash, ["pragma", "--format", ""], 2);
      expect(reply.sort()).toEqual(["json", "llm", "plain"]);
    });
  },
);

/** Live structural contexts, in the bash/zsh `words` + cursor-index form. */
const STRUCTURE = [
  {
    at: "pragma co",
    words: ["pragma", "co"],
    cword: 1,
    offers: ["colophon", "config"],
  },
  {
    at: "pragma block <TAB>",
    words: ["pragma", "block", ""],
    cword: 2,
    offers: ["list", "lookup", "sample"],
  },
  {
    at: "pragma setup <TAB>",
    words: ["pragma", "setup", ""],
    cword: 2,
    offers: ["completions", "lsp", "mcp", "skills"],
  },
  {
    at: "pragma create <TAB>",
    words: ["pragma", "create", ""],
    cword: 2,
    offers: ["application", "component", "package"],
  },
  {
    at: "pragma --format <TAB>",
    words: ["pragma", "--format", ""],
    cword: 2,
    offers: ["json", "llm", "plain"],
  },
  {
    at: "pragma block lookup --<TAB>",
    words: ["pragma", "block", "lookup", "--"],
    cword: 3,
    offers: ["--detail", "--format", "--help", "--verbose"],
  },
] as const;

/**
 * Every noun the live grammar declares — the whole table the zsh script
 * `compadd`s for a partial noun. A literal, so a noun silently added, dropped
 * or leaked into the table fails rather than widening the expectation.
 */
const NOUNS = [
  "block",
  "capabilities",
  "colophon",
  "config",
  "create",
  "doctor",
  "graph",
  "info",
  "mcp",
  "modifier",
  "ontology",
  "prompt",
  "setup",
  "skill",
  "sources",
  "standard",
  "tier",
  "token",
  "upgrade",
] as const;

describe.skipIf(!hasShell("bash"))(
  "generated bash — the live grammar's script",
  () => {
    it("is a script bash accepts, for both the live and the fixture grammar", () => {
      // The one executable syntax gate that runs everywhere. It is not vacuous:
      // `SAFE_TOKEN_RE` admits shell reserved words, so a noun named `esac`
      // would emit `case "$noun" in esac) … esac` and bash -n would reject it.
      expect(parses("bash", live.bash)).toBe(0);
      expect(parses("bash", fixture.bash)).toBe(0);
    });

    it.each(STRUCTURE)("answers $at from the inlined table, execing nothing", ({
      words,
      cword,
      offers,
    }) => {
      const { reply, calls } = driveBash(live.bash, words, cword);
      expect(reply.sort()).toEqual([...offers].sort());
      // The structural tier is the point of a generated script: a TAB here
      // must never cost a process spawn, nor depend on a pack being built.
      expect(calls).toEqual([]);
    });

    it("hands __complete the protocol argv and OFFERS what it answers", () => {
      // The last mile, and the only assertion that covers it: everything else
      // here observes what the script SENDS. A script that sends a perfect argv
      // and then drops the reply (`COMPREPLY=()` after the mapfile) leaves TAB
      // silently dead and was green across 258 tests.
      const { reply, calls } = driveBash(
        live.bash,
        ["pragma", "block", "lookup", "ds:global.component.but"],
        3,
      );
      expect(calls).toEqual([PROTOCOL_ARGV]);
      expect(reply).toEqual(answersFor("ds:global.component.but"));
    });

    it("keeps an interleaved global value flag in the argv it delegates", () => {
      // `parse.ts` is the one place that decides a flag's value is not a
      // positional. It only ever sees what the script sends, so the script must
      // send the flag AND its value, in place.
      const { calls } = driveBash(
        live.bash,
        ["pragma", "block", "lookup", "--format", "json", "ds:g"],
        5,
      );
      expect(calls).toEqual([
        ["__complete", "--", "block", "lookup", "--format", "json", "ds:g"],
      ]);
    });

    it("delegates a variadic second positional with both words in place", () => {
      const { calls } = driveBash(
        live.bash,
        ["pragma", "standard", "lookup", "cs:a", "cs:code.arr"],
        4,
      );
      expect(calls).toEqual([
        ["__complete", "--", "standard", "lookup", "cs:a", "cs:code.arr"],
      ]);
    });

    it("gates the exec on minChars: one typed char offers nothing and execs nothing", () => {
      // `minChars` lives ONLY in the generated scripts — `__complete -- block
      // lookup d` answers with candidates. This is the gate that stops a stray
      // TAB from spawning a process, and nothing else observes it.
      const one = driveBash(live.bash, ["pragma", "block", "lookup", "d"], 3);
      expect(one.reply).toEqual([]);
      expect(one.calls).toEqual([]);

      const two = driveBash(live.bash, ["pragma", "block", "lookup", "ds"], 3);
      expect(two.calls).toEqual([
        ["__complete", "--", "block", "lookup", "ds"],
      ]);
    });
  },
);

describe.skipIf(!hasShell("zsh"))(
  "generated zsh — the live grammar's script (skipped where zsh is absent)",
  () => {
    it("is a script zsh accepts", () => {
      expect(parses("zsh", live.zsh)).toBe(0);
    });

    // zsh's script `compadd`s the model's table and zsh's own completion system
    // filters it — unlike bash (`compgen -W … -- "$cur"`) and fish, which filter
    // before the shell sees the list. So a zsh assertion is about the OFFERED
    // set, never the filtered one. That makes exactly ONE row a superset (a
    // partial noun offers all 19 nouns, not the two that match); it gets its own
    // test below, and the other five are asserted as the exact sets zsh really
    // returns. An `arrayContaining` here would be blind to the regression this
    // file exists to catch — a slot that offers EXTRA, wrong candidates.
    it.each(
      STRUCTURE.filter((row) => row.at !== "pragma co"),
    )("OFFERS exactly the candidates for $at, execing nothing", ({
      words,
      cword,
      offers,
    }) => {
      const { reply, calls } = driveZsh(live.zsh, words, cword);
      expect(reply.sort()).toEqual([...offers].sort());
      expect(calls).toEqual([]);
    });

    it("offers the WHOLE noun table for a partial noun, leaving the filtering to zsh", () => {
      const { reply, calls } = driveZsh(live.zsh, ["pragma", "co"], 1);
      // The whole table is the claim, so assert the whole table: nouns that do
      // not start with `co` are offered too (the observable difference from
      // bash, which returns exactly two here), and none that the grammar does
      // not declare. Three `toContain`s passed against a table cut to three.
      expect(reply.sort()).toEqual([...NOUNS].sort());
      expect(calls).toEqual([]);
    });

    it("hands __complete the SAME protocol argv bash does, and OFFERS the answer", () => {
      const { reply, calls } = driveZsh(
        live.zsh,
        ["pragma", "block", "lookup", "ds:global.component.but"],
        3,
      );
      expect(calls).toEqual([PROTOCOL_ARGV]);
      // `_matches=()` before the `compadd` passes every other assertion here.
      expect(reply).toEqual(answersFor("ds:global.component.but"));
    });

    it("gates the exec on minChars: one typed char execs nothing, two execs once", () => {
      const one = driveZsh(live.zsh, ["pragma", "block", "lookup", "d"], 3);
      expect(one.reply).toEqual([]);
      expect(one.calls).toEqual([]);

      // The positive half keeps the negative one honest: a driver that failed
      // outright would also record nothing.
      const two = driveZsh(live.zsh, ["pragma", "block", "lookup", "ds"], 3);
      expect(two.calls).toEqual([
        ["__complete", "--", "block", "lookup", "ds"],
      ]);
    });
  },
);

describe.skipIf(!hasShell("fish"))(
  "generated fish — the live grammar's script (skipped where fish is absent)",
  () => {
    it("is a script fish accepts", () => {
      expect(parses("fish", live.fish)).toBe(0);
    });

    it.each([
      { line: "pragma co", offers: ["colophon", "config"] },
      { line: "pragma block ", offers: ["list", "lookup", "sample"] },
      {
        line: "pragma setup ",
        offers: ["completions", "lsp", "mcp", "skills"],
      },
      {
        line: "pragma create ",
        offers: ["application", "component", "package"],
      },
      // fish's own inline convention: it returns the whole `--flag=value` word,
      // not the bare value bash offers. Assert what fish returns.
      {
        line: "pragma --format=",
        offers: ["--format=json", "--format=llm", "--format=plain"],
      },
    ])("answers $line from the inlined rules, execing nothing", ({
      line,
      offers,
    }) => {
      const { reply, calls } = driveFish(live.fish, line);
      expect(reply.sort()).toEqual([...offers].sort());
      expect(calls).toEqual([]);
    });

    it("hands __complete the SAME protocol argv bash does, and OFFERS the answer", () => {
      const { reply, calls } = driveFish(
        live.fish,
        "pragma block lookup ds:global.component.but",
      );
      expect(calls).toEqual([PROTOCOL_ARGV]);
      expect(reply).toEqual(answersFor("ds:global.component.but"));
    });

    it("answers `--<TAB>` with the flag names, but DOES exec where bash and zsh do not", () => {
      // The sixth `STRUCTURE` row, which the table above cannot hold because
      // fish behaves differently here — measured, not assumed. bash and zsh
      // route a flag-name context through one exclusive `case` arm and exec
      // nothing; fish evaluates EVERY `complete` rule matching the position, so
      // the positional's `-a "(pragma __complete -- …)"` fires alongside the
      // flag-name rules whenever the token clears `minChars` — and `--` is two
      // characters. The candidates are right either way; the cost is a process
      // spawn on a purely structural TAB. `emitScripts.ts`'s "structure execs
      // nothing" is therefore a bash/zsh claim, not a fish one.
      const { reply, calls } = driveFish(live.fish, "pragma block lookup --");
      expect(calls).toEqual([["__complete", "--", "block", "lookup", "--"]]);
      // And the exec's answer is OFFERED alongside the flags, so the cost is
      // not only the spawn: whatever `__complete` returns for a `--` partial
      // lands in the user's candidate list. (It returns nothing today.)
      expect(reply.sort()).toEqual(
        [
          "--detail",
          "--format",
          "--help",
          "--verbose",
          ...answersFor("--"),
        ].sort(),
      );
    });

    it("gates the exec on minChars: one typed char execs nothing, two execs once", () => {
      const one = driveFish(live.fish, "pragma block lookup d");
      expect(one.reply).toEqual([]);
      expect(one.calls).toEqual([]);

      // The positive half keeps the negative one honest: a driver that failed
      // outright would also record nothing.
      const two = driveFish(live.fish, "pragma block lookup ds");
      expect(two.calls).toEqual([
        ["__complete", "--", "block", "lookup", "ds"],
      ]);
    });
  },
);
