import {
  collectEffects,
  dryRun,
  dryRunWith,
  type Effect,
} from "@canonical/task";
import { describe, expect, it } from "vitest";
import detectHarnesses from "./detectHarnesses.js";
import type { PlatformEnv } from "./platformPaths.js";

/**
 * A fixed platform so the `~/…` signal paths and any `PATH`-based process probe
 * resolve deterministically (never against the CI host's real HOME/PATH).
 */
const PLATFORM: PlatformEnv = {
  platform: "linux",
  env: { PATH: "/usr/bin:/bin" },
  home: "/home/tester",
  isWsl: false,
};

const mockExists =
  (predicate: (path: string) => boolean) =>
  (effect: Effect): unknown =>
    predicate((effect as Effect & { _tag: "Exists" }).path);

const mocks = (
  predicate: (path: string) => boolean,
): Map<string, (effect: Effect) => unknown> =>
  new Map([["Exists", mockExists(predicate)]]);

describe("detectHarnesses", () => {
  it("produces exists effects for each harness signal", () => {
    const effects = collectEffects(detectHarnesses("/project"));
    const existsEffects = effects.filter((e) => e._tag === "Exists");
    expect(existsEffects.length).toBeGreaterThan(0);
  });

  it("detects Claude Code when ~/.claude and .mcp.json exist", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
      mocks(
        (path) => path.includes(".claude") || path === "/project/.mcp.json",
      ),
    );

    const claude = result.value.find((d) => d.harness.id === "claude-code");
    expect(claude).toBeDefined();
    expect(claude?.confidence).toBe("high");
    expect(claude?.configExists).toBe(true);
    expect(claude?.configPath).toBe("/project/.mcp.json");
  });

  it("detects Cursor when .cursor directory exists", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
      mocks((path) => path.includes(".cursor")),
    );

    const cursor = result.value.find((d) => d.harness.id === "cursor");
    expect(cursor).toBeDefined();
    expect(cursor?.confidence).toBe("high");
  });

  it("detects Windsurf when .windsurf directory exists", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
      mocks((path) => path.includes(".windsurf")),
    );

    const windsurf = result.value.find((d) => d.harness.id === "windsurf");
    expect(windsurf).toBeDefined();
    expect(windsurf?.confidence).toBe("high");
  });

  it("detects multiple harnesses simultaneously", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
      mocks(
        (path) =>
          path.includes(".claude") ||
          path.includes(".mcp.json") ||
          path.includes(".cursor"),
      ),
    );

    expect(result.value.length).toBeGreaterThanOrEqual(2);
    const ids = result.value.map((d) => d.harness.id);
    expect(ids).toContain("claude-code");
    expect(ids).toContain("cursor");
  });

  it("returns empty array when no signals match", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
      mocks(() => false),
    );

    expect(result.value).toEqual([]);
  });

  it("sorts results by confidence (high first)", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
      mocks(
        (path) =>
          path.includes(".claude") ||
          path.includes(".mcp.json") ||
          path.includes(".cursor"),
      ),
    );

    const order = { high: 0, medium: 1, low: 2 } as const;
    for (let i = 1; i < result.value.length; i++) {
      expect(order[result.value[i].confidence]).toBeGreaterThanOrEqual(
        order[result.value[i - 1].confidence],
      );
    }
  });

  // Cline is re-enabled (7a) but detected ONLY by its extension: a bare
  // `.vscode` directory belongs to VS Code, so it must detect VS Code alone and
  // never co-detect Cline (which would write an inert `mcpServers` block).
  it("detects VS Code but NOT Cline from a bare .vscode directory", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
      mocks((path) => path.includes(".vscode")),
    );

    const ids = result.value.map((d) => d.harness.id);
    expect(ids).toContain("vscode");
    expect(ids).not.toContain("cline");
  });

  // AMENDED (was `not.toContain("vscode")`): `~/.vscode/extensions` is now a
  // VS Code INSTALLATION signal, and it is exactly the directory a Cline
  // extension lives in — so the two must co-detect. Asserting otherwise
  // asserted the false negative this pairing exists to rule out. The invariant
  // that actually matters (a bare `.vscode` PROJECT dir must not detect Cline)
  // is the test above and is untouched.
  it("detects BOTH Cline and VS Code from an extension in ~/.vscode/extensions", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
      new Map<string, (effect: Effect) => unknown>([
        [
          "Exists",
          (effect) =>
            (effect as Effect & { _tag: "Exists"; path: string }).path ===
            "/home/tester/.vscode/extensions",
        ],
        [
          "Glob",
          (effect) =>
            (effect as Effect & { _tag: "Glob"; pattern: string }).pattern ===
            "saoudrizwan.claude-dev-*/package.json"
              ? ["saoudrizwan.claude-dev-3.20.0/package.json"]
              : [],
        ],
      ]),
    );

    const cline = result.value.find((d) => d.harness.id === "cline");
    expect(cline).toBeDefined();
    expect(cline?.confidence).toBe("medium");

    const vscode = result.value.find((d) => d.harness.id === "vscode");
    expect(vscode).toBeDefined();
    // The extensions DIRECTORY is a `directory` signal, so it scores high.
    expect(vscode?.confidence).toBe("high");

    // They still group to the ONE file, under their two distinct keys — the
    // two-level dedup documented on the `cline` row.
    expect(cline?.configPath).toBe("/project/.vscode/mcp.json");
    expect(vscode?.configPath).toBe("/project/.vscode/mcp.json");
    expect(cline?.harness.mcpKey).toBe("mcpServers");
    expect(vscode?.harness.mcpKey).toBe("servers");
  });

  it("reports configExists as false when config file is missing", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
      mocks((path) => path.includes(".cursor") && !path.endsWith("mcp.json")),
    );

    const cursor = result.value.find((d) => d.harness.id === "cursor");
    expect(cursor).toBeDefined();
    expect(cursor?.configExists).toBe(false);
  });

  it("dry run collects effects without executing", () => {
    const result = dryRun(detectHarnesses("/project"));
    expect(result.effects.length).toBeGreaterThan(0);
    expect(Array.isArray(result.value)).toBe(true);
  });
});

/**
 * VS Code installation detection. Each case drives EXACTLY ONE of the row's
 * five signals so the probes can never be quietly collapsed into an AND: a
 * machine with the editor installed but no committed `.vscode/` must still be
 * seen. `dryRunWith` over a `Map` keyed by effect tag is the whole seam — no
 * colleague's machine required.
 */
describe("detectHarnesses — VS Code installation signals", () => {
  const withPath = (path: string): PlatformEnv => ({
    ...PLATFORM,
    env: { ...PLATFORM.env, PATH: path },
  });

  const only = (
    wanted: string,
    seen?: string[],
  ): Map<string, (effect: Effect) => unknown> =>
    new Map([
      [
        "Exists",
        (effect: Effect): unknown => {
          const { path } = effect as Effect & { _tag: "Exists"; path: string };
          seen?.push(path);
          return path === wanted;
        },
      ],
    ]);

  it("detects a snap install from /snap/bin/code alone", () => {
    const result = dryRunWith(
      detectHarnesses("/project", withPath("/usr/bin:/bin:/snap/bin")),
      only("/snap/bin/code"),
    );

    expect(result.value.map((d) => d.harness.id)).toEqual(["vscode"]);
    // `code` on PATH means "installed", not "this project uses it".
    expect(result.value[0]?.confidence).toBe("medium");
    expect(result.value[0]?.configExists).toBe(false);
  });

  it("detects a deb install from /usr/bin/code alone", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
      only("/usr/bin/code"),
    );

    expect(result.value.map((d) => d.harness.id)).toEqual(["vscode"]);
    expect(result.value[0]?.confidence).toBe("medium");
  });

  it("detects the user config directory alone, at high confidence", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
      only("/home/tester/.config/Code/User"),
    );

    expect(result.value.map((d) => d.harness.id)).toEqual(["vscode"]);
    expect(result.value[0]?.confidence).toBe("high");
  });

  it("honours $XDG_CONFIG_HOME and never probes ~/.config for the config dir", () => {
    const seen: string[] = [];
    const platform: PlatformEnv = {
      ...PLATFORM,
      env: { ...PLATFORM.env, XDG_CONFIG_HOME: "/xdg/config" },
    };
    const result = dryRunWith(
      detectHarnesses("/project", platform),
      only("/xdg/config/Code/User", seen),
    );

    expect(result.value.map((d) => d.harness.id)).toEqual(["vscode"]);
    expect(result.value[0]?.confidence).toBe("high");
    expect(seen).toContain("/xdg/config/Code/User");
    expect(seen).not.toContain("/home/tester/.config/Code/User");
  });

  /**
   * The macOS host. VS Code keeps its user data under
   * `~/Library/Application Support` (env-paths' DATA base), which is not where
   * `$XDG_CONFIG_HOME` resolves on darwin — `xdgConfigHome` falls back to
   * `~/.config` on every platform, deliberately, because a tool documenting
   * `~/.config/<tool>` reads that path on macOS too. A default macOS install
   * also puts no `code` on PATH (the palette's "Install 'code' command in
   * PATH" is opt-in), and a fresh install has no `~/.vscode/extensions` yet —
   * so this directory is the only probe that can see such a machine.
   */
  const DARWIN: PlatformEnv = {
    platform: "darwin",
    env: { PATH: "/usr/bin:/bin" },
    home: "/Users/tester",
    isWsl: false,
  };

  it("detects a macOS install from ~/Library/Application Support alone", () => {
    const seen: string[] = [];
    const result = dryRunWith(
      detectHarnesses("/project", DARWIN),
      only("/Users/tester/Library/Application Support/Code/User", seen),
    );

    expect(result.value.map((d) => d.harness.id)).toEqual(["vscode"]);
    // A config DIRECTORY, so the same `high` tier the linux probe scores.
    expect(result.value[0]?.confidence).toBe("high");
    expect(result.value[0]?.configPath).toBe("/project/.vscode/mcp.json");
    // ...and it is genuinely a SECOND location, not the XDG one under another
    // name: that probe ran too, and on darwin it looks under `~/.config`.
    expect(seen).toContain("/Users/tester/.config/Code/User");
  });

  it("detects the extensions directory alone, without Cline", () => {
    const result = dryRunWith(
      detectHarnesses("/project", PLATFORM),
      only("/home/tester/.vscode/extensions"),
    );

    const ids = result.value.map((d) => d.harness.id);
    expect(ids).toContain("vscode");
    // The directory exists but holds no matching extension, so no `Glob` hit.
    expect(ids).not.toContain("cline");
    expect(ids).not.toContain("roo-code");
  });

  /**
   * The hostile guard. A POPULATED `PATH` and a `Glob` that matches ANY
   * pattern, but nothing exists on disk ⇒ nothing is detected. This proves the
   * `process` arm probes the filesystem rather than the PATH string, and that a
   * permissive glob cannot manufacture an extension hit through the `exists`
   * gate `checkExtension` puts in front of it.
   */
  it("detects nothing from a populated PATH and a permissive glob when nothing exists", () => {
    const result = dryRunWith(
      detectHarnesses(
        "/project",
        withPath("/usr/bin:/bin:/snap/bin:/usr/local/bin"),
      ),
      new Map<string, (effect: Effect) => unknown>([
        ["Exists", () => false],
        ["Glob", () => ["anything-1.0.0/package.json"]],
      ]),
    );

    expect(result.value).toEqual([]);
  });
});
