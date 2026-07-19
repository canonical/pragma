/**
 * `checkShellCompletions` — the doctor check that verifies completions are
 * installed AND functional.
 *
 * Runs against an isolated HOME and a controlled `$SHELL` so the three gates —
 * the resolver effect test, the real install-path probe, and the zsh fpath
 * activation gate — are deterministic. The effect test (gate 1) drives the real
 * `runComplete` resolver; the install/fpath gates write real files under the
 * temp HOME rather than mocking the fs.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { completionScriptPath } from "../../setup/shell.js";
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

/** Write the (empty) completion script to the shell's real install path. */
function installScript(shell: "zsh" | "bash" | "fish"): void {
  const path = completionScriptPath(shell);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "# stub\n");
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

  it("passes for bash once the script exists at its real path", async () => {
    process.env.SHELL = "/usr/bin/bash";
    installScript("bash");
    const result = await checkShellCompletions(tmp());
    expect(result.status).toBe("pass");
    expect(result.detail).toMatch(/bash installed and resolving/);
  });

  it("passes for fish once the script exists at its real path", async () => {
    process.env.SHELL = "/usr/bin/fish";
    installScript("fish");
    const result = await checkShellCompletions(tmp());
    expect(result.status).toBe("pass");
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
    expect(result.detail).toMatch(/zsh installed and resolving/);
  });
});
