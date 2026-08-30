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
