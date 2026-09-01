/**
 * Shell detection + completion-script install paths.
 *
 * Shell selection is detection-only, and detection means the shell the user is
 * RUNNING — read from the process tree — not the login shell `$SHELL` records.
 * The two differ constantly and the difference is invisible until TAB fails.
 * `$HOME` is read at call time so tests can isolate it.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { BIN_NAME } from "../../constants.js";

/** The shells `setup completions` can install for. */
export type ShellId = "zsh" | "bash" | "fish";

const SHELL_MAP: Record<string, ShellId> = {
  zsh: "zsh",
  bash: "bash",
  fish: "fish",
};

/**
 * What detection concluded about the shell the user is actually in.
 *
 * `ambiguous` is a first-class answer, not a failure to try harder. Installing
 * for the wrong shell is INVISIBLE: the file is written, `doctor` goes green,
 * and the user finds out when they press TAB months later and nothing happens.
 * A named skip that says what was seen is worth more than a confident guess.
 */
export type ShellDetection =
  | { readonly kind: "detected"; readonly shell: ShellId }
  | {
      readonly kind: "ambiguous";
      /** What `$SHELL` claims, when it names a shell we support. */
      readonly login: ShellId;
    }
  | { readonly kind: "unknown" };

/** One process in the ancestry: what it is called, and who started it. */
export interface ProcessEntry {
  readonly name: string;
  readonly ppid: number;
}

/** Look up one process. Injected in tests so the tree is deterministic. */
export type ProcessReader = (pid: number) => ProcessEntry | undefined;

/** How far up the process tree to look before giving up. */
const MAX_ANCESTRY = 8;

/**
 * The command name and parent of a pid, read from `/proc` (Linux).
 *
 * `/proc/<pid>/stat` is `pid (comm) state ppid …`, and `comm` may itself
 * contain spaces and parentheses — so the fields are taken after the LAST
 * `)`, never by splitting the whole line.
 *
 * @param pid - The process to inspect.
 * @returns Its command name and parent pid, or undefined when unreadable.
 * @note Impure — reads /proc.
 */
function procEntry(pid: number): { name: string; ppid: number } | undefined {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const close = stat.lastIndexOf(")");
    const open = stat.indexOf("(");
    if (close < 0 || open < 0) return undefined;
    const name = stat.slice(open + 1, close);
    const rest = stat.slice(close + 2).split(" ");
    const ppid = Number.parseInt(rest[1] ?? "", 10);
    return Number.isFinite(ppid) ? { name, ppid } : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The same lookup for platforms without `/proc`, via one `ps` call.
 *
 * @param pid - The process to inspect.
 * @returns Its command name and parent pid, or undefined.
 * @note Impure — spawns `ps`.
 */
function psEntry(pid: number): { name: string; ppid: number } | undefined {
  try {
    const out = execFileSync("ps", ["-o", "ppid=,comm=", "-p", String(pid)], {
      encoding: "utf8",
      timeout: 2000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const match = /^(\d+)\s+(.*)$/.exec(out);
    if (match === null) return undefined;
    return { name: match[2] ?? "", ppid: Number.parseInt(match[1] ?? "", 10) };
  } catch {
    return undefined;
  }
}

/** Normalize a process name to a shell id: `-zsh`, `/bin/bash`, `zsh` all map. */
function asShell(name: string): ShellId | undefined {
  const base = (name.split("/").pop() ?? "").replace(/^-/, "");
  return SHELL_MAP[base];
}

/**
 * Walk the process ancestry looking for the shell this invocation is running
 * inside.
 *
 * The walk matters: a CLI reached through `npm run`, `bunx`, or a wrapper
 * script has `node` or `sh` as its immediate parent, and the user's actual
 * shell is a level or two further up.
 *
 * @returns The shell found, or undefined.
 * @note Impure — reads the process table.
 */
function runningShell(read?: ProcessReader): ShellId | undefined {
  const entryOf = read ?? (existsSync("/proc") ? procEntry : psEntry);
  let pid = process.ppid;
  for (let step = 0; step < MAX_ANCESTRY && pid > 1; step += 1) {
    const entry = entryOf(pid);
    if (entry === undefined) return undefined;
    const shell = asShell(entry.name);
    if (shell !== undefined) return shell;
    pid = entry.ppid;
  }
  return undefined;
}

/**
 * Detect the shell the user is actually running in.
 *
 * This reads the PROCESS TREE, not `$SHELL`. `$SHELL` is the login shell
 * recorded in `/etc/passwd`; it is not changed by starting a different shell,
 * so a user whose account says `bash` but who lives in `zsh` was silently
 * given a bash script — and `doctor` then reported `✓ Shell completions: bash
 * up to date and resolving`, a green check for a shell they never open, while
 * the shell they do use had nothing.
 *
 * `$SHELL` survives only as a CONTRADICTION detector. When the process tree
 * gives no answer (a CI runner, an editor task, a daemon), a `$SHELL` value is
 * a guess about a session that may not exist, so the answer is `ambiguous` and
 * the caller is expected to say so rather than pick.
 *
 * @param read - Injected process-table reader; defaults to the real one.
 * @returns What could be established about the running shell.
 * @note Impure — reads the process table and `$SHELL`.
 */
export function detectShell(read?: ProcessReader): ShellDetection {
  const running = runningShell(read);
  if (running !== undefined) return { kind: "detected", shell: running };

  const login = SHELL_MAP[(process.env.SHELL ?? "").split("/").pop() ?? ""];
  return login === undefined
    ? { kind: "unknown" }
    : { kind: "ambiguous", login };
}

/**
 * The standard install path for a shell's completion script.
 *
 * The BASENAME is {@link BIN_NAME}, never a literal, because `emitScripts`
 * derives the script's own `#compdef` / `complete -F` / `complete -c` from that
 * same name, and for two of the three shells the basename decides whether the
 * file is ever loaded. Measured against real shells with the distribution
 * renamed to `widget9`:
 *
 * - **fish** autoloads `completions/<cmd>.fish` BY NAME. A correct `widget9`
 *   script in a file called `pragma.fish` is never loaded — TAB silently falls
 *   back to filenames. Verified: renaming that one file is the entire
 *   difference between candidates and no candidates.
 * - **bash-completion** looks up `completions/<cmd>` by the command name the
 *   same way. Verified against bash-completion 2.11's `__load_completion`:
 *   with the file named `widget9`, `complete -p widget9` reports
 *   `complete -F _widget9 widget9`; with the identical file named `pragma`,
 *   `_widget9` is never defined and bash falls back to `_minimal`.
 * - **zsh** does NOT work that way: `compinit` binds by the `#compdef` tag
 *   inside the file, so `~/.zfunc/_pragma` holding `#compdef widget9` does
 *   complete `widget9` (verified — `_comps[widget9]` resolves to `_pragma`).
 *   The basename still matters, for a different reason: it names the function
 *   zsh autoloads, and two distributions both writing `_pragma` would silently
 *   overwrite each other's completions.
 *
 * Either way `setup completions` and `doctor` report success, so nothing else
 * would tell the user.
 *
 * @param shell - The target shell.
 * @returns The absolute path the completion script is written to.
 * @note Impure — reads the home directory.
 */
export function completionScriptPath(shell: ShellId): string {
  const home = homedir();
  switch (shell) {
    case "zsh":
      return join(home, ".zfunc", `_${BIN_NAME}`);
    case "bash":
      return join(
        home,
        ".local",
        "share",
        "bash-completion",
        "completions",
        BIN_NAME,
      );
    case "fish":
      return join(home, ".config", "fish", "completions", `${BIN_NAME}.fish`);
  }
}

/**
 * The post-install activation hint for a shell.
 *
 * bash and fish install into directories their completion systems auto-load, so
 * the only step left is a fresh shell. zsh's `~/.zfunc` is NOT auto-loaded: the
 * script never loads unless `~/.zfunc` is on `$fpath` BEFORE `compinit` runs —
 * the single trap every zsh user hits, so we spell out the exact `.zshrc` lines.
 *
 * @param shell - The shell the script was installed for.
 * @returns A one-or-more-line activation instruction.
 */
export function activationHint(shell: ShellId): string {
  switch (shell) {
    case "zsh":
      return (
        "To activate, ensure ~/.zfunc is on your fpath BEFORE compinit. Add to ~/.zshrc:\n" +
        "    fpath=(~/.zfunc $fpath)\n" +
        "    autoload -Uz compinit && compinit\n" +
        "Then restart your shell (or run `exec zsh`)."
      );
    case "bash":
      return "To activate, restart your shell (bash-completion auto-loads the script).";
    case "fish":
      return "To activate, restart your shell (fish auto-loads the script).";
  }
}
