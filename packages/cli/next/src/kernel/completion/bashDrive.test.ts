import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { completionFixture } from "../../testing/fixtures/completionFixture.js";
import { emitScripts } from "./emitScripts.js";

/**
 * M1 regression: the generated bash script must complete the `--flag=value`
 * wordbreak form. With `=` in COMP_WORDBREAKS, bash splits `--format=` into
 * `--format` `=` `` (or `` after `=`); without the normalization at the top of
 * `_pragma`, the value slot falls through to the noun/positional arm and
 * offers the WRONG candidates. These tests drive the REAL bash to prove the
 * fix, so the static tier answers `--format=<TAB>` as a flag value with zero
 * exec (the resolver is only reached for `{kind:"entity"}` contexts).
 */

/** Whether a usable bash is on PATH (the package pins os:["linux"], so it is). */
const bashOk =
  spawnSync("bash", ["-c", "printf ok"], { encoding: "utf-8" }).stdout === "ok";

/** The bash completion script for the fixture grammar (has the global --format). */
const script = emitScripts([completionFixture]).bash;

/**
 * Source the generated script in a real bash, place the cursor per COMP_WORDS
 * / COMP_CWORD, invoke `_pragma`, and return COMPREPLY line-by-line.
 */
function driveBash(words: readonly string[], cword: number): string[] {
  const dir = mkdtempSync(join(tmpdir(), "pragma-bashdrive-"));
  const file = join(dir, "completion.bash");
  writeFileSync(file, script);
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
  });
  return result.stdout.split("\n").filter((line) => line.length > 0);
}

describe.skipIf(!bashOk)("generated bash — --flag=value wordbreak (M1)", () => {
  it("routes --format=<TAB> to the format values (not nouns/positionals)", () => {
    // Default COMP_WORDBREAKS split: `--format` `=` `` (empty current word).
    const reply = driveBash(["pragma", "--format", "=", ""], 3);
    expect(reply.sort()).toEqual(["json", "llm", "plain"]);
  });

  it("filters the value by the partial typed after =", () => {
    const reply = driveBash(["pragma", "--format", "=", "j"], 3);
    expect(reply).toEqual(["json"]);
  });

  it("routes a verb-scoped --format=<TAB> the same way", () => {
    // After a noun/verb the value must still route as a flag value, never as
    // block's positional (which would offer entity/enum candidates instead).
    const reply = driveBash(["pragma", "block", "get", "--format", "=", ""], 5);
    expect(reply.sort()).toEqual(["json", "llm", "plain"]);
  });

  it("still completes the space form --format <TAB> (unbroken)", () => {
    const reply = driveBash(["pragma", "--format", ""], 2);
    expect(reply.sort()).toEqual(["json", "llm", "plain"]);
  });
});
