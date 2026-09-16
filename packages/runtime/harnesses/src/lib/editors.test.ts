import { describe, expect, it } from "vitest";
import editorClis, { vscodeUserDir } from "./editors.js";
import type { PlatformEnv } from "./platformPaths.js";

const PLATFORM: PlatformEnv = {
  platform: "linux",
  env: {},
  home: "/home/tester",
  isWsl: false,
};

const on = (overrides: Partial<PlatformEnv>): PlatformEnv => ({
  ...PLATFORM,
  ...overrides,
});

describe("editorClis registry", () => {
  it("contains the six VS Code-family editors, VS Code then Insiders first", () => {
    expect(editorClis.map((e) => e.id)).toEqual([
      "vscode",
      "vscode-insiders",
      "vscodium",
      "cursor",
      "windsurf",
      "antigravity",
    ]);
  });

  it("maps each editor to its CLI binary name", () => {
    const byId = Object.fromEntries(editorClis.map((e) => [e.id, e.cli]));
    expect(byId).toEqual({
      vscode: "code",
      "vscode-insiders": "code-insiders",
      vscodium: "codium",
      cursor: "cursor",
      windsurf: "windsurf",
      antigravity: "antigravity",
    });
  });

  it("resolves every extensions dir under the user's home", () => {
    expect(editorClis.map((e) => e.extensionsDir(PLATFORM))).toEqual([
      "/home/tester/.vscode/extensions",
      "/home/tester/.vscode-insiders/extensions",
      "/home/tester/.vscode-oss/extensions",
      "/home/tester/.cursor/extensions",
      "/home/tester/.windsurf/extensions",
      "/home/tester/.antigravity/extensions",
    ]);
  });

  it("names one macOS app bundle per editor — the PATH fallback's whole input", () => {
    // Every row needs one: the palette command that puts the CLI on PATH is
    // opt-in on macOS, so a row without a bundle is a row that reports "editor
    // not found" on a stock machine that has the editor.
    for (const editor of editorClis) {
      expect(editor.darwinBundles?.length).toBe(1);
      expect(editor.darwinBundles?.[0]).toMatch(/\.app$/);
    }
    expect(
      Object.fromEntries(editorClis.map((e) => [e.id, e.darwinBundles?.[0]])),
    ).toEqual({
      vscode: "Visual Studio Code.app",
      "vscode-insiders": "Visual Studio Code - Insiders.app",
      vscodium: "VSCodium.app",
      cursor: "Cursor.app",
      windsurf: "Windsurf.app",
      antigravity: "Antigravity.app",
    });
  });

  it("carries a userDir for the three products vscodeUserDir covers, and no other", () => {
    // A fork's user directory is renamed along with the app, and guessing one
    // would be a path nothing has confirmed. A row without a `userDir` falls
    // back to its CLI and extensions probes — what it did before the column.
    expect(
      editorClis.filter((e) => e.userDir !== undefined).map((e) => e.id),
    ).toEqual(["vscode", "vscode-insiders", "vscodium"]);
    expect(
      editorClis.flatMap((e) =>
        e.userDir === undefined ? [] : [e.userDir(PLATFORM)],
      ),
    ).toEqual([
      "/home/tester/.config/Code/User",
      "/home/tester/.config/Code - Insiders/User",
      "/home/tester/.config/VSCodium/User",
    ]);
  });
});

describe("vscodeUserDir", () => {
  // The three arms are NOT interchangeable, and no existing helper spans them:
  // darwin follows env-paths' DATA base, win32 `%APPDATA%`, and everything else
  // the XDG config home. This matrix is what the harness rows' home configs,
  // their detection signals and `setup lsp`'s probe all resolve through.
  it("uses the XDG config home off darwin/win32, honouring $XDG_CONFIG_HOME", () => {
    expect(vscodeUserDir("Code", PLATFORM)).toBe(
      "/home/tester/.config/Code/User",
    );
    expect(
      vscodeUserDir("VSCodium", on({ env: { XDG_CONFIG_HOME: "/xdg" } })),
    ).toBe("/xdg/VSCodium/User");
  });

  it("uses ~/Library/Application Support on darwin — NOT ~/.config, NOT Preferences", () => {
    // `xdgConfigHome` resolves under `~/.config` on darwin by design, and
    // `userConfigBase`'s darwin arm is `~/Library/Preferences`. Both are the
    // wrong directory for a VS Code product, and both are silent when wrong.
    const darwin = on({ platform: "darwin", home: "/Users/tester" });
    expect(vscodeUserDir("Code", darwin)).toBe(
      "/Users/tester/Library/Application Support/Code/User",
    );
    expect(vscodeUserDir("Code - Insiders", darwin)).toBe(
      "/Users/tester/Library/Application Support/Code - Insiders/User",
    );
    // $XDG_CONFIG_HOME is ignored on darwin — the product does not read it.
    expect(
      vscodeUserDir("VSCodium", {
        ...darwin,
        env: { XDG_CONFIG_HOME: "/xdg" },
      }),
    ).toBe("/Users/tester/Library/Application Support/VSCodium/User");
  });

  it("uses %APPDATA% on win32, falling back to ~/AppData/Roaming when unset", () => {
    const win32 = on({ platform: "win32", home: "C:/Users/tester" });
    expect(vscodeUserDir("Code", win32)).toBe(
      "C:/Users/tester/AppData/Roaming/Code/User",
    );
    expect(
      vscodeUserDir("Code", { ...win32, env: { APPDATA: "D:/roaming" } }),
    ).toBe("D:/roaming/Code/User");
  });
});
