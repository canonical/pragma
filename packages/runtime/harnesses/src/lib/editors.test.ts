import { describe, expect, it } from "vitest";
import editorClis from "./editors.js";
import type { PlatformEnv } from "./platformPaths.js";

const PLATFORM: PlatformEnv = {
  platform: "linux",
  env: {},
  home: "/home/tester",
  isWsl: false,
};

describe("editorClis registry", () => {
  it("contains the five VS Code-family editors, VS Code first", () => {
    expect(editorClis.map((e) => e.id)).toEqual([
      "vscode",
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
      vscodium: "codium",
      cursor: "cursor",
      windsurf: "windsurf",
      antigravity: "antigravity",
    });
  });

  it("resolves every extensions dir under the user's home", () => {
    expect(editorClis.map((e) => e.extensionsDir(PLATFORM))).toEqual([
      "/home/tester/.vscode/extensions",
      "/home/tester/.vscode-oss/extensions",
      "/home/tester/.cursor/extensions",
      "/home/tester/.windsurf/extensions",
      "/home/tester/.antigravity/extensions",
    ]);
  });
});
