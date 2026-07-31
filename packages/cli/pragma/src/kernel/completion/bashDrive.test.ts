import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import { completionFixture } from "../../testing/fixtures/completionFixture.js";
import { emitScripts } from "./emitScripts.js";

/**
 * Drive the GENERATED bash completion script in a real bash.
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
 * `driveBash` puts a RECORDER named `pragma` first on the child's `PATH`, so
 * every candidate set comes with the exec log that produced it. That turns
 * `emitScripts.ts`'s docblock claim — "the static tier answers STRUCTURE with
 * zero exec; only `{kind:"names"}` value contexts shell out" — into an
 * assertion, and pins the exact argv the script hands `<bin> __complete`.
 * Recording first on `PATH` also means a developer with a real `pragma`
 * installed can never have it exec'd by this suite.
 *
 * What this file proves by EXECUTION, on every machine that runs the suite:
 * bash parses both scripts; the live script offers the live grammar's
 * structure with zero process exec; it hands `__complete` a literal argv; it
 * honours the `minChars` gate. It proves nothing about zsh or fish.
 */

/** Whether a usable bash is on PATH (the package pins os:["linux"], so it is). */
const bashOk =
  spawnSync("bash", ["-c", "printf ok"], { encoding: "utf-8" }).stdout === "ok";

/** The bash script for the fixture grammar (has the global --format). */
const fixtureScript = emitScripts([completionFixture]).bash;
/** The bash script a user actually installs, for the LIVE grammar. */
const liveScript = emitScripts(capabilities).bash;

/** The frame separating one recorded exec from the next in the record file. */
const CALL = "<<<CALL>>>";

/**
 * A directory holding a recorder stub named `pragma`: a two-line bash script
 * that appends a framed copy of its own argv to `$RECORD` and produces no
 * candidates. Placed FIRST on the child's PATH by {@link driveBash}.
 */
const stubDir = mkdtempSync(join(tmpdir(), "pragma-drive-stub-"));
writeFileSync(
  join(stubDir, "pragma"),
  `#!/usr/bin/env bash\n{ printf '${CALL}\\n'; printf '%s\\n' "$@"; } >> "$RECORD"\n`,
);
chmodSync(join(stubDir, "pragma"), 0o755);

/** What one drive observed: the offered candidates and the execs it caused. */
interface Drive {
  /** COMPREPLY, line by line. */
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

/**
 * Source a generated script in a real bash, place the cursor per COMP_WORDS /
 * COMP_CWORD, invoke `_pragma`, and report both COMPREPLY and every exec the
 * script performed.
 *
 * `PATH` keeps the real bin dirs after the stub: node resolves the spawned
 * command through the CHILD's `PATH`, so a stub-only `PATH` cannot find bash.
 */
function driveBash(
  script: string,
  words: readonly string[],
  cword: number,
): Drive {
  const dir = mkdtempSync(join(tmpdir(), "pragma-bashdrive-"));
  const file = join(dir, "completion.bash");
  const record = join(dir, "record");
  writeFileSync(file, script);
  writeFileSync(record, "");
  const wordsLiteral = words
    .map((word) => `'${word.replace(/'/g, "'\\''")}'`)
    .join(" ");
  const driver = [
    `source '${file}'`,
    `COMP_WORDS=(${wordsLiteral})`,
    `COMP_CWORD=${cword}`,
    "_pragma",
    `printf '%s\\n' "\${COMPREPLY[@]}"`,
  ].join("\n");
  const result = spawnSync("bash", ["--norc", "--noprofile", "-c", driver], {
    encoding: "utf-8",
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env.PATH ?? ""}`,
      RECORD: record,
    },
  });
  return {
    reply: result.stdout.split("\n").filter((line) => line.length > 0),
    calls: parseCalls(readFileSync(record, "utf-8")),
  };
}

/** `bash -n`: does bash accept this text as a script at all? */
function parses(script: string): number | null {
  const dir = mkdtempSync(join(tmpdir(), "pragma-bashsyntax-"));
  const file = join(dir, "completion.bash");
  writeFileSync(file, script);
  return spawnSync("bash", ["-n", file], { encoding: "utf-8" }).status;
}

describe.skipIf(!bashOk)("generated bash — --flag=value wordbreak (M1)", () => {
  it("routes --format=<TAB> to the format values (not nouns/positionals)", () => {
    // Default COMP_WORDBREAKS split: `--format` `=` `` (empty current word).
    const { reply } = driveBash(
      fixtureScript,
      ["pragma", "--format", "=", ""],
      3,
    );
    expect(reply.sort()).toEqual(["json", "llm", "plain"]);
  });

  it("filters the value by the partial typed after =", () => {
    const { reply } = driveBash(
      fixtureScript,
      ["pragma", "--format", "=", "j"],
      3,
    );
    expect(reply).toEqual(["json"]);
  });

  it("routes a verb-scoped --format=<TAB> the same way", () => {
    // After a noun/verb the value must still route as a flag value, never as
    // block's positional (which would offer entity/enum candidates instead).
    const { reply } = driveBash(
      fixtureScript,
      ["pragma", "block", "get", "--format", "=", ""],
      5,
    );
    expect(reply.sort()).toEqual(["json", "llm", "plain"]);
  });

  it("still completes the space form --format <TAB> (unbroken)", () => {
    const { reply } = driveBash(fixtureScript, ["pragma", "--format", ""], 2);
    expect(reply.sort()).toEqual(["json", "llm", "plain"]);
  });
});

describe.skipIf(!bashOk)("generated bash — the live grammar's script", () => {
  it("is a script bash accepts, for both the live and the fixture grammar", () => {
    // The one executable syntax gate this repo can run. It is not vacuous:
    // `SAFE_TOKEN_RE` admits shell reserved words, so a noun named `esac`
    // would emit `case "$noun" in esac) … esac` and bash -n would reject it.
    expect(parses(liveScript)).toBe(0);
    expect(parses(fixtureScript)).toBe(0);
  });

  it.each([
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
  ])("answers $at from the inlined table, execing nothing", ({
    words,
    cword,
    offers,
  }) => {
    const { reply, calls } = driveBash(liveScript, words, cword);
    expect(reply.sort()).toEqual(offers);
    // The structural tier is the whole point of a generated script: a TAB here
    // must never cost a ~100ms process spawn, and must never depend on a pack.
    expect(calls).toEqual([]);
  });

  it("hands __complete the protocol argv, and nothing else, for a name context", () => {
    const { calls } = driveBash(
      liveScript,
      ["pragma", "block", "lookup", "ds:global.component.but"],
      3,
    );
    expect(calls).toEqual([
      ["__complete", "--", "block", "lookup", "ds:global.component.but"],
    ]);
  });

  it("keeps an interleaved global value flag in the argv it delegates", () => {
    // `parse.ts` is the one place that decides a flag's value is not a
    // positional. It only ever sees what the script sends, so the script must
    // send the flag AND its value, in place.
    const { calls } = driveBash(
      liveScript,
      ["pragma", "block", "lookup", "--format", "json", "ds:g"],
      5,
    );
    expect(calls).toEqual([
      ["__complete", "--", "block", "lookup", "--format", "json", "ds:g"],
    ]);
  });

  it("delegates a variadic second positional with both words in place", () => {
    const { calls } = driveBash(
      liveScript,
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
    const one = driveBash(liveScript, ["pragma", "block", "lookup", "d"], 3);
    expect(one.reply).toEqual([]);
    expect(one.calls).toEqual([]);

    const two = driveBash(liveScript, ["pragma", "block", "lookup", "ds"], 3);
    expect(two.calls).toEqual([["__complete", "--", "block", "lookup", "ds"]]);
  });
});
