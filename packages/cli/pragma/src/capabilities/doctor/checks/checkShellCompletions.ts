import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  indexCompletionEnv,
  runComplete,
} from "../../../kernel/completion/index.js";
import { capabilities } from "../../index.js";
import { detectCompletions } from "../../setup/operations/setupCompletions.js";
import { activationHint } from "../../setup/shell.js";
import type { CheckResult } from "../types.js";

const NAME = "Shell completions";

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
 * Check that shell completions are installed AND functional.
 *
 * Three gates, in order:
 * 1. The resolver answers (`completeProbe` drives `runComplete` end to end) —
 *    the effect every installed script depends on. A failure here is a real
 *    regression, so it fails even when nothing is installed.
 * 2. The installed script is present AND is the script `setup completions`
 *    would write now. This asks `detectCompletions` — the ONE owner of that
 *    decision — rather than re-deriving the shell and the path here and
 *    settling for `existsSync`. A file that merely exists proves nothing: a
 *    user upgrading across a grammar change keeps the old script, loses the
 *    moved nouns from TAB, and used to be told everything was fine.
 * 3. For zsh, `~/.zfunc` is on `$fpath` — the activation step setup can only
 *    hint. Installed-but-unwired reports a distinct remedy.
 *
 * @param cwd - The project directory (the resolver's entity seam, and the
 *   `completion` config gate 2 compares against).
 * @returns A CheckResult: pass (up to date + wired + answering), fail (with the
 *   attributable remedy), or skip (shell undetected).
 * @note Impure — reads `$SHELL`, the install path, the config layers, `.zshrc`,
 *   and drives the storeless resolver.
 */
export async function checkShellCompletions(cwd: string): Promise<CheckResult> {
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
      remedy: "Report this as a bug — `pragma __complete` should never throw.",
    };
  }
  if (candidates === 0) {
    return {
      name: NAME,
      status: "fail",
      detail: "completion resolver returned no candidates for `pragma <TAB>`",
      remedy: "Report this as a bug — the noun context is always non-empty.",
    };
  }

  // 2. The installed script is the one `setup completions` would write now.
  const { shell, path, state } = await detectCompletions(cwd);
  if (shell === null || path === null) {
    return {
      name: NAME,
      status: "skip",
      detail: "resolver OK; shell not detected ($SHELL unset)",
    };
  }
  if (state === "absent") {
    return {
      name: NAME,
      status: "fail",
      detail: `resolver OK; ${shell} script not installed`,
      remedy: "pragma setup completions",
    };
  }
  if (state === "stale") {
    return {
      name: NAME,
      status: "fail",
      detail: `resolver OK; ${shell} script at ${path} is out of date`,
      remedy: "pragma setup completions",
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
    detail: `${shell} installed and resolving (${candidates} nouns)`,
  };
}
