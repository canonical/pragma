/**
 * `checkShellCompletions` — the doctor check that verifies completions are
 * installed AND up to date AND functional.
 *
 * Runs against an isolated HOME and an injected shell so the gates —
 * the resolver effect test, the install probe, and the zsh fpath activation
 * gate — are deterministic. The effect test (gate 1) drives the real
 * `runComplete` resolver; the install/fpath gates write real files under the
 * temp HOME rather than mocking the fs.
 *
 * Gate 2 compares BYTES, not existence, so the "installed" cases here write the
 * real `emitScripts(capabilities)[shell]` body. A file that merely exists is
 * now the failing case, and it has its own test — as does the boundary on the
 * other side, where a per-project `completion` config must NOT be able to
 * condemn the one global script.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emitScripts } from "../../../kernel/completion/emitScripts.js";
import { capabilities } from "../../index.js";
import { detectCompletions } from "../../setup/operations/setupCompletions.js";
import {
  completionScriptPath,
  type ShellDetection,
  type ShellId,
} from "../../setup/shell.js";
import type { CheckResult } from "../types.js";
import { checkShellCompletions } from "./checkShellCompletions.js";

const roots: string[] = [];
const tmp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "pragma-completions-"));
  roots.push(dir);
  return dir;
};

let prevHome: string | undefined;
let prevPath: string | undefined;
beforeEach(() => {
  prevHome = process.env.HOME;
  prevPath = process.env.PATH;
  process.env.HOME = tmp();
  // The installed script spawns `pragma` for every name context, and the check
  // now verifies that it can. Put one on an isolated PATH so these cases are
  // about the SCRIPT rather than about the host's install.
  const bin = tmp();
  writeFileSync(join(bin, "pragma"), "");
  process.env.PATH = bin;
});
afterEach(() => {
  process.env.HOME = prevHome;
  process.env.PATH = prevPath;
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

/** Write `body` to the shell's real install path. */
function writeScript(shell: ShellId, body: string): void {
  const path = completionScriptPath(shell);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
}

/** Install the script `setup completions` would write for this shell. */
function installScript(shell: ShellId): void {
  writeScript(shell, emitScripts(capabilities)[shell]);
}

/**
 * Run the check the way `doctor` does: the `completions` target detects once
 * per invocation and the check reads that one answer, so the test drives the
 * same pairing rather than letting the check re-read behind its own back.
 */
async function check(cwd: string, shell: ShellId | null): Promise<CheckResult> {
  // The shell is INJECTED rather than forced through `$SHELL`: detection reads
  // the process tree now, and a test that set `$SHELL` was only ever asserting
  // against the login shell — the exact confusion this check exists to catch.
  const detection: ShellDetection =
    shell === null ? { kind: "unknown" } : { kind: "detected", shell };
  return checkShellCompletions(cwd, await detectCompletions(cwd, detection));
}

/** Write a `.zshrc` that puts ~/.zfunc on fpath. */
function wireZfunc(): void {
  writeFileSync(
    join(process.env.HOME as string, ".zshrc"),
    "fpath=(~/.zfunc $fpath)\nautoload -Uz compinit && compinit\n",
  );
}

describe("checkShellCompletions — effect test (gate 1)", () => {
  it("passes the resolver gate: `pragma <TAB>` resolves nouns", async () => {
    // No shell → skip, but only AFTER the resolver answered — the detail proves
    // the effect test ran and succeeded. The proof is the same fact worded for
    // a reader ("pragma answers `<TAB>`") rather than as "resolver OK": the
    // gate it pins is unchanged, only the sentence that reports it.
    const result = await check(tmp(), null);
    expect(result.status).toBe("skip");
    expect(result.detail).toMatch(/answers `<TAB>`/);
  });
});

describe("checkShellCompletions — install probe (gate 2)", () => {
  it("a never-installed script is available (opt-in, not a fault) with the setup command", async () => {
    const result = await check(tmp(), "bash");
    expect(result.status).toBe("available");
    expect(result.detail).toMatch(/not installed/);
    expect(result.remedy).toBe("pragma setup completions");
  });

  it("does not claim a script is installed when the binary is off PATH", async () => {
    // This gate runs before the install probe, so it saw only that the binary
    // does not resolve — and reported `bash script installed, but ...` on a
    // machine where nothing had ever been installed. Anyone invoking this CLI
    // by absolute path lands here, and the row invented the file it exists to
    // report on.
    process.env.PATH = tmp(); // an empty PATH: no binary to find
    const result = await check(tmp(), "bash");
    expect(result.detail).not.toMatch(/script installed/);
    expect(result.detail).toMatch(/is not on PATH/);
    // Nothing was installed, so nothing that exists is broken.
    expect(result.status).toBe("available");
    expect(result.remedy).toMatch(/on your PATH/);
  });

  it("fails when an INSTALLED script cannot reach the binary", async () => {
    installScript("bash");
    process.env.PATH = tmp();
    const result = await check(tmp(), "bash");
    expect(result.status).toBe("fail");
    expect(result.detail).toMatch(/script installed, but/);
  });

  it("passes for bash once the up-to-date script is at its real path", async () => {
    installScript("bash");
    const result = await check(tmp(), "bash");
    expect(result.status).toBe("pass");
    expect(result.detail).toMatch(
      /bash \(the shell you are in\) — installed, up to date, and completing/,
    );
  });

  it("passes for fish once the up-to-date script is at its real path", async () => {
    installScript("fish");
    const result = await check(tmp(), "fish");
    expect(result.status).toBe("pass");
  });

  it("fails when the installed script is out of date", async () => {
    // Reproduced against the compiled binary before this was fixed: overwrite
    // the installed script with junk and `doctor` still reported
    // "✓ Shell completions: bash installed and resolving (19 nouns)", while
    // `setup completions` in the same breath said "Updating bash completions".
    // Every user upgrading across a grammar change lands here: the old script
    // offers the old nouns and misses the new ones, and doctor is the one
    // command whose job is to say so.
    writeScript("bash", "# STALE JUNK\n");
    const result = await check(tmp(), "bash");
    expect(result.status).toBe("fail");
    expect(result.detail).toMatch(/out of date/);
    expect(result.remedy).toBe("pragma setup completions");
  });

  it("does NOT condemn the global script for one project's `completion` config", async () => {
    // The script is ONE file per user; `completion` config is layered per
    // project. Comparing the global file against only THIS directory's body
    // made `doctor`'s verdict flip with `cd`: reproduced against the real
    // check, a project declaring `minChars: 5` passed in its own directory and
    // failed in every other, and running the offered remedy there moved the
    // failure back rather than closing it. The first assertion is the
    // discriminator — this project really does ask for a different body — so
    // deleting the config write below turns the test red.
    installScript("bash");
    const cwd = tmp();
    writeFileSync(
      join(cwd, "pragma.config.ts"),
      "export default { completion: { minChars: 5 } };\n",
    );
    expect(
      (await detectCompletions(cwd, { kind: "detected", shell: "bash" })).state,
    ).toBe("stale");
    expect((await check(cwd, "bash")).status).toBe("pass");
  });
});

describe("checkShellCompletions — zsh fpath activation (gate 3)", () => {
  it("fails when the zsh script is installed but ~/.zfunc is not on fpath", async () => {
    installScript("zsh");
    const result = await check(tmp(), "zsh");
    expect(result.status).toBe("fail");
    expect(result.detail).toMatch(/not on your fpath/);
    // The remedy IS the activation hint — the exact ~/.zshrc lines.
    expect(result.remedy).toMatch(/fpath=\(~\/\.zfunc/);
  });

  it("passes once the zsh script is installed AND ~/.zfunc is on fpath", async () => {
    installScript("zsh");
    wireZfunc();
    const result = await check(tmp(), "zsh");
    expect(result.status).toBe("pass");
    expect(result.detail).toMatch(
      /zsh \(the shell you are in\) — installed, up to date, and completing/,
    );
  });
});
