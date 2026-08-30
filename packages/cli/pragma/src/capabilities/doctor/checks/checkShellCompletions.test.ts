/**
 * `checkShellCompletions` — the doctor check that verifies completions are
 * installed AND up to date AND functional.
 *
 * Runs against an isolated HOME and a controlled `$SHELL` so the three gates —
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
import { completionScriptPath, type ShellId } from "../../setup/shell.js";
import { checkShellCompletions } from "./checkShellCompletions.js";

const roots: string[] = [];
const tmp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "pragma-completions-"));
  roots.push(dir);
  return dir;
};

let prevHome: string | undefined;
let prevShell: string | undefined;
beforeEach(() => {
  prevHome = process.env.HOME;
  prevShell = process.env.SHELL;
  process.env.HOME = tmp();
});
afterEach(() => {
  process.env.HOME = prevHome;
  if (prevShell === undefined) delete process.env.SHELL;
  else process.env.SHELL = prevShell;
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
    // the effect test ran and succeeded.
    delete process.env.SHELL;
    const result = await checkShellCompletions(tmp());
    expect(result.status).toBe("skip");
    expect(result.detail).toMatch(/resolver OK/);
  });
});

describe("checkShellCompletions — install probe (gate 2)", () => {
  it("fails when $SHELL is set but no script is installed", async () => {
    process.env.SHELL = "/usr/bin/bash";
    const result = await checkShellCompletions(tmp());
    expect(result.status).toBe("fail");
    expect(result.detail).toMatch(/not installed/);
    expect(result.remedy).toBe("pragma setup completions");
  });

  it("passes for bash once the up-to-date script is at its real path", async () => {
    process.env.SHELL = "/usr/bin/bash";
    installScript("bash");
    const result = await checkShellCompletions(tmp());
    expect(result.status).toBe("pass");
    expect(result.detail).toMatch(/bash up to date and resolving/);
  });

  it("passes for fish once the up-to-date script is at its real path", async () => {
    process.env.SHELL = "/usr/bin/fish";
    installScript("fish");
    const result = await checkShellCompletions(tmp());
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
    process.env.SHELL = "/usr/bin/bash";
    writeScript("bash", "# STALE JUNK\n");
    const result = await checkShellCompletions(tmp());
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
    process.env.SHELL = "/usr/bin/bash";
    installScript("bash");
    const cwd = tmp();
    writeFileSync(
      join(cwd, "pragma.config.ts"),
      "export default { completion: { minChars: 5 } };\n",
    );
    expect((await detectCompletions(cwd)).state).toBe("stale");
    expect((await checkShellCompletions(cwd)).status).toBe("pass");
  });
});

describe("checkShellCompletions — zsh fpath activation (gate 3)", () => {
  it("fails when the zsh script is installed but ~/.zfunc is not on fpath", async () => {
    process.env.SHELL = "/usr/bin/zsh";
    installScript("zsh");
    const result = await checkShellCompletions(tmp());
    expect(result.status).toBe("fail");
    expect(result.detail).toMatch(/not on your fpath/);
    // The remedy IS the activation hint — the exact ~/.zshrc lines.
    expect(result.remedy).toMatch(/fpath=\(~\/\.zfunc/);
  });

  it("passes once the zsh script is installed AND ~/.zfunc is on fpath", async () => {
    process.env.SHELL = "/usr/bin/zsh";
    installScript("zsh");
    wireZfunc();
    const result = await checkShellCompletions(tmp());
    expect(result.status).toBe("pass");
    expect(result.detail).toMatch(/zsh up to date and resolving/);
  });
});
