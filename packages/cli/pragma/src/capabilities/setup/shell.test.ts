/**
 * Shell detection — the shell the user is RUNNING, not the one `/etc/passwd`
 * records.
 *
 * The defect these pin: `$SHELL` is the LOGIN shell. It does not change when
 * you start a different shell, so a user whose account says bash but who works
 * in zsh was handed a bash completion script — and doctor then reported it
 * green, for a shell they never open, while zsh had nothing. The failure is
 * invisible until TAB does nothing months later, which is exactly why an
 * unresolved shell must be reported rather than guessed.
 */

import { afterEach, describe, expect, it } from "vitest";
import { detectShell, type ProcessEntry } from "./shell.js";

/** A fake process tree: pid → entry, walked exactly as /proc would be. */
const tree = (entries: Record<number, ProcessEntry>) => (pid: number) =>
  entries[pid];

const prevShell = process.env.SHELL;
afterEach(() => {
  process.env.SHELL = prevShell;
});

describe("the running shell wins over $SHELL", () => {
  it("reports the shell that actually started this process", () => {
    // The case from a real machine: login shell bash, working shell zsh.
    process.env.SHELL = "/bin/bash";
    const read = tree({
      [process.ppid]: { name: "zsh", ppid: 100 },
      100: { name: "systemd", ppid: 1 },
    });
    expect(detectShell(read)).toEqual({ kind: "detected", shell: "zsh" });
  });

  it("walks past the wrappers a CLI is usually reached through", () => {
    // `npm run` / `bunx` / a shim script put node or sh between the shell and
    // us, so the immediate parent is almost never the answer.
    process.env.SHELL = "/bin/bash";
    const read = tree({
      [process.ppid]: { name: "node", ppid: 200 },
      200: { name: "npm", ppid: 300 },
      300: { name: "fish", ppid: 400 },
    });
    expect(detectShell(read)).toEqual({ kind: "detected", shell: "fish" });
  });

  it("strips the login dash and any path", () => {
    const read = tree({ [process.ppid]: { name: "-zsh", ppid: 1 } });
    expect(detectShell(read)).toEqual({ kind: "detected", shell: "zsh" });
    const path = tree({ [process.ppid]: { name: "/usr/bin/bash", ppid: 1 } });
    expect(detectShell(path)).toEqual({ kind: "detected", shell: "bash" });
  });
});

describe("an unresolved shell is reported, never guessed", () => {
  it("is ambiguous when only $SHELL has an opinion", () => {
    // No shell in the ancestry — a CI runner, an editor task, a daemon. The
    // login shell names a session that may not exist, so it is not an answer.
    process.env.SHELL = "/bin/bash";
    const read = tree({
      [process.ppid]: { name: "node", ppid: 900 },
      900: { name: "containerd", ppid: 1 },
    });
    expect(detectShell(read)).toEqual({ kind: "ambiguous", login: "bash" });
  });

  it("is unknown when nothing names a supported shell", () => {
    process.env.SHELL = "/usr/bin/nu";
    const read = tree({ [process.ppid]: { name: "init", ppid: 1 } });
    expect(detectShell(read)).toEqual({ kind: "unknown" });
  });

  it("is unknown when $SHELL is unset and the tree is silent", () => {
    process.env.SHELL = "";
    const read = tree({ [process.ppid]: { name: "init", ppid: 1 } });
    expect(detectShell(read)).toEqual({ kind: "unknown" });
  });

  it("gives up rather than walking an unbounded tree", () => {
    // A cycle (or a very deep tree) must terminate.
    process.env.SHELL = "";
    const read = (pid: number): ProcessEntry => ({ name: "node", ppid: pid });
    expect(detectShell(read)).toEqual({ kind: "unknown" });
  });
});
