import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  indexCompletionEnv,
  runComplete,
} from "../../../kernel/completion/index.js";
import { capabilities } from "../../index.js";
import {
  activationHint,
  completionScriptPath,
  detectShell,
} from "../../setup/shell.js";
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
 * 2. The script file exists at the shell's real install path (`shell.ts`) —
 *    NOT a `"pragma"` substring in an RC file, which `setup completions` never
 *    writes.
 * 3. For zsh, `~/.zfunc` is on `$fpath` — the activation step setup can only
 *    hint. Installed-but-unwired reports a distinct remedy.
 *
 * @param cwd - The project directory (for the resolver's entity seam).
 * @returns A CheckResult: pass (installed + wired + answering), fail (with the
 *   attributable remedy), or skip (shell undetected).
 * @note Impure — reads `$SHELL`, the install path, `.zshrc`, and drives the
 *   storeless resolver.
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

  // 2. The script file exists at the shell's real install path.
  const shell = detectShell();
  if (!shell) {
    return {
      name: NAME,
      status: "skip",
      detail: "resolver OK; shell not detected ($SHELL unset)",
    };
  }
  const path = completionScriptPath(shell);
  if (!existsSync(path)) {
    return {
      name: NAME,
      status: "fail",
      detail: `resolver OK; ${shell} script not installed`,
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
