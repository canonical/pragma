/**
 * `executableCandidates` — the shared PATH/PATHEXT rules.
 *
 * These are the rules that decide whether a probe SEES an installed tool, and
 * every way of getting them wrong is silent: harness detection reports the
 * harness absent, `setup lsp` reports a clean skip. Both consumers now resolve
 * through this one function, so the platform matrix is pinned here once —
 * driven entirely off injected {@link PlatformEnv} fixtures, never the host.
 */

import { describe, expect, it } from "vitest";
import {
  appBundleCandidates,
  executableCandidates,
} from "./executablePaths.js";
import type { PlatformEnv } from "./platformPaths.js";

const platformOf = (
  platform: PlatformEnv["platform"],
  env: Record<string, string | undefined>,
): PlatformEnv => ({ platform, env, home: "/home/u", isWsl: false });

describe("executableCandidates", () => {
  it("joins the bare name onto each PATH dir on a posix host", () => {
    const candidates = executableCandidates(
      "code",
      platformOf("linux", { PATH: "/usr/bin:/usr/local/bin" }),
    );
    expect(candidates).toEqual(["/usr/bin/code", "/usr/local/bin/code"]);
  });

  it("ignores PATHEXT away from win32 — a posix binary carries no suffix", () => {
    const candidates = executableCandidates(
      "code",
      platformOf("darwin", { PATH: "/usr/bin", PATHEXT: ".EXE;.CMD" }),
    );
    expect(candidates).toEqual(["/usr/bin/code"]);
  });

  it("crosses every PATH dir with every PATHEXT suffix under win32, splitting PATH on ;", () => {
    const candidates = executableCandidates(
      "code",
      platformOf("win32", { PATH: "C:/bin;C:/tools", PATHEXT: ".EXE;.CMD" }),
    );
    expect(candidates.map((c) => c.replaceAll("\\", "/"))).toEqual([
      "C:/bin/code.EXE",
      "C:/bin/code.CMD",
      "C:/tools/code.EXE",
      "C:/tools/code.CMD",
    ]);
  });

  it("finds the .cmd shim npm installs an editor CLI as, under the default PATHEXT", () => {
    const candidates = executableCandidates(
      "codium",
      platformOf("win32", { PATH: "C:/bin" }),
    ).map((c) => c.replaceAll("\\", "/"));
    expect(candidates).toContain("C:/bin/codium.CMD");
    expect(candidates).toContain("C:/bin/codium.BAT");
  });

  it("drops empty PATH segments and yields nothing for an unset PATH", () => {
    expect(
      executableCandidates("code", platformOf("linux", { PATH: "/usr/bin::" })),
    ).toEqual(["/usr/bin/code"]);
    expect(executableCandidates("code", platformOf("linux", {}))).toEqual([]);
  });

  it("drops empty PATHEXT segments under win32", () => {
    expect(
      executableCandidates(
        "code",
        platformOf("win32", { PATH: "C:/bin", PATHEXT: ".EXE;;" }),
      ).map((c) => c.replaceAll("\\", "/")),
    ).toEqual(["C:/bin/code.EXE"]);
  });
});

/**
 * `appBundleCandidates` — the macOS app-bundle fallback.
 *
 * Kept a SEPARATE list from the PATH candidates so a caller can say HOW an
 * editor was found; these cases pin the two bases, their order, and the fact
 * that nothing is produced off darwin (where a `/Applications` path would be
 * a guess about a directory that does not exist).
 */
describe("appBundleCandidates", () => {
  const BUNDLE = "Visual Studio Code.app";
  const darwin = platformOf("darwin", {});

  it("returns the system bundle path then the per-user one, in that order", () => {
    // `/Applications` is the installer default; `~/Applications` is where a
    // per-user install (and Homebrew Cask's --appdir) lands.
    expect(appBundleCandidates("code", darwin, [BUNDLE])).toEqual([
      "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
      "/home/u/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
    ]);
  });

  it("resolves the per-user base against the captured home, not a literal ~", () => {
    expect(
      appBundleCandidates("codium", { ...darwin, home: "/Users/other" }, [
        "VSCodium.app",
      ]),
    ).toContain(
      "/Users/other/Applications/VSCodium.app/Contents/Resources/app/bin/codium",
    );
  });

  it("crosses every bundle a row declares, both bases per bundle", () => {
    expect(appBundleCandidates("code", darwin, ["A.app", "B.app"])).toEqual([
      "/Applications/A.app/Contents/Resources/app/bin/code",
      "/home/u/Applications/A.app/Contents/Resources/app/bin/code",
      "/Applications/B.app/Contents/Resources/app/bin/code",
      "/home/u/Applications/B.app/Contents/Resources/app/bin/code",
    ]);
  });

  it("yields nothing away from darwin, and nothing for a row with no bundle", () => {
    expect(
      appBundleCandidates("code", platformOf("linux", {}), [BUNDLE]),
    ).toEqual([]);
    expect(
      appBundleCandidates("code", platformOf("win32", {}), [BUNDLE]),
    ).toEqual([]);
    expect(appBundleCandidates("code", darwin, [])).toEqual([]);
  });
});
