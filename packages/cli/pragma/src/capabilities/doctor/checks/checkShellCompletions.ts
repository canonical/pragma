import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { BIN_NAME } from "../../../constants.js";
import {
  emitScripts,
  indexCompletionEnv,
  runComplete,
} from "../../../kernel/completion/index.js";
import { capabilities } from "../../index.js";
import type { CompletionsDetection } from "../../setup/operations/index.js";
import { activationHint, type ShellId } from "../../setup/shell.js";
import type { CheckResult } from "../types.js";

const NAME = "Shell completions";

/** The one remedy for an absent or out-of-date script. */
const INSTALL_REMEDY = `${BIN_NAME} setup completions`;

/**
 * Whether the installed script is the config-free emit — the body
 * `setup completions` writes when no `completion` config tunes it.
 *
 * The completion script is ONE file per user, but the `completion` config it is
 * rendered from is layered per project. So `detectCompletions(cwd)`'s `stale`
 * means only "not what THIS directory would write", and on its own it would let
 * any project that tunes `minChars` call a globally-correct script out of date
 * from every other directory — a `doctor` verdict that flips with `cd`, and a
 * remedy that just moves the failure to the project you came from. A script
 * that matches neither this project's body nor the untuned one is the one that
 * is genuinely stale.
 *
 * @param path - The install path.
 * @param shell - The detected shell.
 * @returns Whether the file there is byte-identical to the untuned emit.
 * @note Impure — reads the install path. An unreadable file counts as `false`.
 */
function isUntunedScript(path: string, shell: ShellId): boolean {
  try {
    return readFileSync(path, "utf-8") === emitScripts(capabilities)[shell];
  } catch {
    return false;
  }
}

/**
 * Whether the user's `.zshrc` puts `~/.zfunc` on `$fpath` — the activation step
 * `setup completions` cannot perform for the user. zsh loads nothing from
 * `~/.zfunc` unless it is on `fpath` before `compinit`, so an installed script
 * with no fpath wiring is silently dead. A permissive check: any `fpath` line
 * mentioning `.zfunc` counts (we can't parse ordering statically).
 */
function zfuncOnFpath(): boolean {
  try {
    const rc = readFileSync(join(homedir(), ".zshrc"), "utf-8");
    return rc
      .split("\n")
      .some((line) => line.includes("fpath") && line.includes(".zfunc"));
  } catch {
    return false;
  }
}

/**
 * Drive the storeless `__complete` resolver and observe that it answers — the
 * completion effect the installed script delegates every name context to. Uses
 * the noun context (`pragma <TAB>`), which is grammar-derived and never empty,
 * so a zero here means the resolver itself is broken, independent of any pack.
 *
 * @param cwd - The project directory (wires the entity seam, though the noun
 *   context does not read it).
 * @returns The number of candidates the resolver returned for a bare `pragma `.
 */
async function completeProbe(cwd: string): Promise<number> {
  const matches = await runComplete(
    [""],
    capabilities,
    indexCompletionEnv(cwd),
  );
  return matches.length;
}

/**
 * Check that shell completions are installed AND up to date AND functional.
 *
 * Three gates, in order:
 * 1. The resolver answers (`completeProbe` drives `runComplete` end to end) —
 *    the effect every installed script depends on. A failure here is a real
 *    regression, so it fails even when nothing is installed.
 * 2. The installed script is present AND is a script `setup completions` would
 *    write. Bytes, not existence: a file that merely exists proves nothing — a
 *    user upgrading across a grammar change keeps the old script, loses the
 *    moved nouns from TAB, and used to be told everything was fine. The path
 *    and this project's body come from `detectCompletions`, the ONE owner of
 *    that decision; {@link isUntunedScript} is what keeps a per-project
 *    `completion` config from condemning a global file (see its docblock).
 * 3. For zsh, `~/.zfunc` is on `$fpath` — the activation step setup can only
 *    hint. Installed-but-unwired reports a distinct remedy.
 *
 * Fault tiers: a broken resolver, a stale installed script, or an unwired zsh
 * install are `fail` — something that exists does not work. A script that was
 * never installed is `available`: completions are opt-in and a fresh install
 * is healthy without them.
 *
 * The detection is passed IN rather than re-read: the `completions` target
 * detects once per invocation and both the setup plan and this row read that
 * one answer, so the two surfaces cannot describe different files.
 *
 * @param cwd - The project directory (the resolver's entity seam).
 * @param d - The `completions` target's detection for this invocation.
 * @returns A CheckResult: pass (up to date + wired + answering), available
 *   (never installed, with the setup remedy), fail (with the attributable
 *   remedy), or skip (shell undetected).
 * @note Impure — reads the install path, `.zshrc`, and drives the resolver.
 */
export async function checkShellCompletions(
  cwd: string,
  d: CompletionsDetection,
): Promise<CheckResult> {
  // 1. Effect test: the resolver the scripts delegate to must actually answer.
  let candidates: number;
  try {
    candidates = await completeProbe(cwd);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      name: NAME,
      status: "fail",
      detail: `completion resolver failed: ${reason}`,
      remedy: `Report this as a bug — \`${BIN_NAME} __complete\` should never throw.`,
    };
  }
  if (candidates === 0) {
    return {
      name: NAME,
      status: "fail",
      detail: `completion resolver returned no candidates for \`${BIN_NAME} <TAB>\``,
      remedy: "Report this as a bug — the noun context is always non-empty.",
    };
  }

  // 2. The check is about the shell the user is IN. Reporting on the login
  //    shell instead is what let this row print a green check for a shell the
  //    user never opens while the one they live in had nothing installed.
  const { shell, path, state } = d;
  if (d.detection.kind === "ambiguous") {
    return {
      name: NAME,
      status: "skip",
      detail: `resolver OK; the running shell cannot be identified (SHELL names ${d.detection.login}, the login shell)`,
      remedy: `Run \`${INSTALL_REMEDY}\` from the shell you want completions in.`,
    };
  }
  if (shell === null || path === null) {
    return {
      name: NAME,
      status: "skip",
      detail: "resolver OK; no bash, zsh, or fish in this process tree",
    };
  }
  // The installed script delegates every name context to the binary. A script
  // that cannot reach it is inert, and reporting it as current is the same
  // false green this row already told once.
  //
  // This gate runs BEFORE the install probe, so it says only what it has
  // verified: that the binary does not resolve. Claiming "script installed" here
  // told a user running this CLI by absolute path that a script they had never
  // installed was broken — an invented file, in the row whose whole job is to
  // report the real one. Nothing installed is still the opt-in `available` tier.
  if (!d.binOnPath) {
    const installed = state !== "absent";
    return {
      name: NAME,
      status: installed ? "fail" : "available",
      detail: installed
        ? `${shell} script installed, but \`${BIN_NAME}\` is not on PATH — the script cannot run it`
        : `resolver OK; \`${BIN_NAME}\` is not on PATH — an installed script cannot run it`,
      remedy: `Put \`${BIN_NAME}\` on your PATH.`,
    };
  }
  if (state === "absent") {
    // Never installed is `available`, not a fault: completions are opt-in and
    // a fresh install is healthy without them. An INSTALLED script that is
    // out of date or unwired (below) is the real failure — something the user
    // set up no longer works.
    return {
      name: NAME,
      status: "available",
      detail: `resolver OK; ${shell} script not installed`,
      remedy: INSTALL_REMEDY,
    };
  }
  if (state === "stale" && !isUntunedScript(path, shell)) {
    return {
      name: NAME,
      status: "fail",
      detail: `resolver OK; ${shell} script at ${path} is out of date`,
      remedy: INSTALL_REMEDY,
    };
  }

  // 3. zsh only: the script is dead unless ~/.zfunc is on $fpath.
  if (shell === "zsh" && !zfuncOnFpath()) {
    return {
      name: NAME,
      status: "fail",
      detail: `installed at ${path}, but ~/.zfunc is not on your fpath`,
      remedy: activationHint("zsh"),
    };
  }

  return {
    name: NAME,
    status: "pass",
    detail: `${shell} (the shell in use) up to date and resolving (${candidates} nouns)`,
  };
}
