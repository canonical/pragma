/**
 * The ONE implementation of "where would this host look for that command".
 *
 * Two rules differ per platform and both are silent when got wrong. `PATH` is
 * split on `;` under win32 and `:` everywhere else; and on Windows an
 * executable is almost never the bare name — npm installs CLI harnesses and
 * editor CLIs as `.cmd` shims (`code.cmd`, `codium.cmd`, `claude.cmd`), never
 * as `.exe` — so a probe that joins the bare name onto each `PATH` directory
 * finds NOTHING on a Windows machine that has the tool installed.
 *
 * Harness detection ({@link checkSignal}'s `process` arm) and `setup lsp`'s
 * editor probe both need this, and the failure mode a second copy would
 * produce is the dangerous one: not a loud error, but a clean SKIP on a
 * machine that has the editor. So the rules live here once, take the injected
 * {@link PlatformEnv} rather than reading `process`, and stay PURE — the
 * caller decides how to test each candidate (a Task `exists` effect during
 * detection, `existsSync` during setup).
 *
 * A third rule lives beside them and is silent in the same way:
 * {@link appBundleCandidates}, the macOS application-bundle fallback for an
 * editor CLI that `PATH` cannot see because the user never ran the palette
 * command that installs it.
 */

import { join } from "node:path";
import type { PlatformEnv } from "./platformPaths.js";

/**
 * The executable suffixes probed on win32 when `PATHEXT` is unset — the usual
 * Windows default. Crucially includes `.CMD`/`.BAT`: npm installs CLI
 * harnesses (`claude`, `codex`, `od`…) as `.cmd` shims, never `.exe`, so an
 * `.exe`-only probe would miss every npm-installed harness on Windows.
 */
const DEFAULT_PATHEXT = ".COM;.EXE;.BAT;.CMD";

/**
 * Every filesystem path the host would consider when resolving a bare command
 * name, in `PATH` order (each directory crossed with each applicable
 * extension).
 *
 * @param name - The bare command name, without an extension.
 * @param platform - The captured host: its OS family, `PATH`, and `PATHEXT`.
 * @returns The candidate paths to test for existence; empty when `PATH` is.
 * @note Pure — it composes strings and tests nothing on the filesystem.
 */
export const executableCandidates = (
  name: string,
  platform: PlatformEnv,
): string[] => {
  const isWindows = platform.platform === "win32";
  const separator = isWindows ? ";" : ":";
  // On win32 an executable matches under any PATHEXT suffix; elsewhere the
  // bare name is the sole candidate (the empty suffix).
  const suffixes = isWindows
    ? (platform.env.PATHEXT ?? DEFAULT_PATHEXT)
        .split(";")
        .filter((suffix) => suffix.length > 0)
    : [""];
  return (platform.env.PATH ?? "")
    .split(separator)
    .filter((dir) => dir.length > 0)
    .flatMap((dir) => suffixes.map((suffix) => join(dir, `${name}${suffix}`)));
};

/**
 * Where a macOS host would find an editor's CLI INSIDE its application bundle,
 * for the machines where `PATH` cannot answer.
 *
 * Every VS Code fork ships its command-line launcher at
 * `<bundle>/Contents/Resources/app/bin/<cli>` and puts NOTHING on `PATH` until
 * the user runs "Shell Command: Install '<cli>' command in PATH" from the
 * command palette. That step is opt-in, and most people never take it — so a
 * stock macOS machine with VS Code installed answered `setup lsp` with "no
 * VS Code-family editor found". A wrong skip reads as a correct answer, which
 * is worse than a wrong failure, and it is the failure a colleague reported.
 *
 * Deliberately a SECOND function rather than more candidates inside
 * {@link executableCandidates}: that one is the "resolve a bare command name"
 * rule, and its other callers resolve `pragma`, which lives in no app bundle.
 * Two lists also let the caller say HOW an editor was found — `via PATH` and
 * `via app bundle` are different facts about the machine, and the report says
 * which one applies.
 *
 * Both bases are returned, system before user: `/Applications` is the
 * installer default, and `~/Applications` is where a per-user install (and
 * Homebrew Cask's `--appdir`) lands.
 *
 * @param name - The bare CLI name, as it is spelled inside the bundle.
 * @param platform - The captured host; anything but darwin yields nothing.
 * @param bundles - The editor's app bundle name(s) (`Cursor.app`, …).
 * @returns The candidate paths to test for existence; `[]` off darwin.
 * @note Pure — it composes strings and tests nothing on the filesystem.
 */
export const appBundleCandidates = (
  name: string,
  platform: PlatformEnv,
  bundles: readonly string[],
): string[] =>
  platform.platform !== "darwin"
    ? []
    : bundles.flatMap((bundle) => [
        join("/Applications", bundle, "Contents/Resources/app/bin", name),
        join(
          platform.home,
          "Applications",
          bundle,
          "Contents/Resources/app/bin",
          name,
        ),
      ]);
