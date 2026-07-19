import { dryRunWith, type Effect } from "@canonical/task";
import { describe, expect, it } from "vitest";
import type { PlatformEnv } from "./platformPaths.js";
import {
  checkSignal,
  type DetectContext,
  scoreConfidence,
  signalTier,
} from "./signals.js";
import type { DetectionSignal } from "./types.js";

/** Build a {@link PlatformEnv} fixture. */
const platform = (overrides: Partial<PlatformEnv> = {}): PlatformEnv => ({
  platform: "linux",
  env: {},
  home: "/home/tester",
  isWsl: false,
  ...overrides,
});

/** Build a {@link DetectContext} fixture. */
const ctx = (overrides: Partial<DetectContext> = {}): DetectContext => ({
  projectRoot: "/project",
  platform: platform(),
  ...overrides,
});

type MockSpec = Record<string, (effect: Effect) => unknown>;
const mocks = (spec: MockSpec): Map<string, (effect: Effect) => unknown> =>
  new Map(Object.entries(spec));

/** Run a single signal check to its boolean value. */
const check = (
  signal: DetectionSignal,
  context: DetectContext,
  spec: MockSpec,
): boolean => dryRunWith(checkSignal(signal, context), mocks(spec)).value;

const existsAt =
  (predicate: (path: string) => boolean) =>
  (effect: Effect): unknown =>
    predicate((effect as Effect & { _tag: "Exists" }).path);

describe("checkSignal — directory / file", () => {
  it("resolves a project-relative path against the project root", () => {
    const seen: string[] = [];
    const result = check({ type: "directory", path: ".cursor" }, ctx(), {
      Exists: existsAt((path) => {
        seen.push(path);
        return path === "/project/.cursor";
      }),
    });
    expect(result).toBe(true);
    expect(seen).toContain("/project/.cursor");
  });

  it("resolves a ~/ path against the platform home", () => {
    const seen: string[] = [];
    const result = check({ type: "file", path: "~/.claude.json" }, ctx(), {
      Exists: existsAt((path) => {
        seen.push(path);
        return path === "/home/tester/.claude.json";
      }),
    });
    expect(result).toBe(true);
    expect(seen).toContain("/home/tester/.claude.json");
  });

  it("returns false when the path is absent", () => {
    expect(
      check({ type: "directory", path: ".roo" }, ctx(), {
        Exists: existsAt(() => false),
      }),
    ).toBe(false);
  });
});

describe("checkSignal — extension", () => {
  const signal: DetectionSignal = {
    type: "extension",
    id: "rooveterinaryinc.roo-cline",
  };

  it("globs the home VS Code extensions dir and matches when non-empty", () => {
    const seen: { pattern: string; cwd: string }[] = [];
    const result = check(signal, ctx(), {
      Glob: (effect) => {
        const glob = effect as Effect & { _tag: "Glob" };
        seen.push({ pattern: glob.pattern, cwd: glob.cwd });
        return ["rooveterinaryinc.roo-cline-1.2.3"];
      },
    });
    expect(result).toBe(true);
    expect(seen[0]).toEqual({
      pattern: "rooveterinaryinc.roo-cline-*",
      cwd: "/home/tester/.vscode/extensions",
    });
  });

  it("returns false when no extension directory matches", () => {
    expect(check(signal, ctx(), { Glob: () => [] })).toBe(false);
  });
});

describe("checkSignal — process", () => {
  const linux = ctx({ platform: platform({ env: { PATH: "/usr/bin:/bin" } }) });

  it("matches a bare name found on PATH (no verify)", () => {
    const seen: string[] = [];
    const result = check({ type: "process", name: "codex" }, linux, {
      Exists: existsAt((path) => {
        seen.push(path);
        return path === "/usr/bin/codex";
      }),
    });
    expect(result).toBe(true);
    expect(seen).toContain("/usr/bin/codex");
    expect(seen).toContain("/bin/codex");
  });

  it("returns false when the name is on no PATH dir", () => {
    expect(
      check({ type: "process", name: "codex" }, linux, {
        Exists: existsAt(() => false),
      }),
    ).toBe(false);
  });

  it("returns false when PATH is empty", () => {
    expect(
      check(
        { type: "process", name: "codex" },
        ctx({ platform: platform({ env: {} }) }),
        { Exists: existsAt(() => true) },
      ),
    ).toBe(false);
  });

  it("appends .exe and splits on ; under win32", () => {
    const seen: string[] = [];
    const result = check(
      { type: "process", name: "codex" },
      ctx({
        platform: platform({
          platform: "win32",
          env: { PATH: "C:/bin;C:/tools" },
        }),
      }),
      {
        Exists: existsAt((path) => {
          seen.push(path);
          return path.endsWith("codex.exe");
        }),
      },
    );
    expect(result).toBe(true);
    expect(seen.some((p) => p.includes("codex.exe"))).toBe(true);
  });

  it("runs verify and matches stdout against the pattern", () => {
    const result = check(
      {
        type: "process",
        name: "od",
        verify: { args: ["--version"], match: /open-?design/i },
      },
      linux,
      {
        Exists: existsAt(() => true),
        Exec: () => ({ stdout: "OpenDesign 1.4.0", stderr: "", exitCode: 0 }),
      },
    );
    expect(result).toBe(true);
  });

  it("fails verify when stdout does not match", () => {
    const result = check(
      {
        type: "process",
        name: "od",
        verify: { args: ["--version"], match: /open-?design/i },
      },
      linux,
      {
        Exists: existsAt(() => true),
        Exec: () => ({ stdout: "some other tool", stderr: "", exitCode: 0 }),
      },
    );
    expect(result).toBe(false);
  });
});

describe("checkSignal — env", () => {
  it("matches presence when no value is required", () => {
    expect(
      check(
        { type: "env", key: "MY_HARNESS" },
        ctx({ platform: platform({ env: { MY_HARNESS: "1" } }) }),
        {},
      ),
    ).toBe(true);
  });

  it("returns false when the key is absent", () => {
    expect(check({ type: "env", key: "MY_HARNESS" }, ctx(), {})).toBe(false);
  });

  it("matches an exact value when required", () => {
    expect(
      check(
        { type: "env", key: "TERM_PROGRAM", value: "vscode" },
        ctx({ platform: platform({ env: { TERM_PROGRAM: "vscode" } }) }),
        {},
      ),
    ).toBe(true);
  });

  it("returns false when the value differs", () => {
    expect(
      check(
        { type: "env", key: "TERM_PROGRAM", value: "vscode" },
        ctx({ platform: platform({ env: { TERM_PROGRAM: "iTerm" } }) }),
        {},
      ),
    ).toBe(false);
  });
});

describe("signalTier", () => {
  it("scores directory and file as high", () => {
    expect(signalTier({ type: "directory", path: ".x" })).toBe("high");
    expect(signalTier({ type: "file", path: ".x" })).toBe("high");
  });

  it("scores extension and process as medium", () => {
    expect(signalTier({ type: "extension", id: "a.b" })).toBe("medium");
    expect(signalTier({ type: "process", name: "a" })).toBe("medium");
  });

  it("scores env as low", () => {
    expect(signalTier({ type: "env", key: "A" })).toBe("low");
  });
});

describe("scoreConfidence", () => {
  const dir: DetectionSignal = { type: "directory", path: ".x" };
  const proc: DetectionSignal = { type: "process", name: "x" };
  const env: DetectionSignal = { type: "env", key: "X" };

  it("returns null when nothing matched", () => {
    expect(scoreConfidence([false, false], [dir, proc])).toBeNull();
  });

  it("returns high for a matched directory (ignoring an unmatched sibling)", () => {
    expect(scoreConfidence([true, false], [dir, proc])).toBe("high");
  });

  it("returns medium for a process-only match", () => {
    expect(scoreConfidence([true], [proc])).toBe("medium");
  });

  it("returns low for an env-only match", () => {
    expect(scoreConfidence([true], [env])).toBe("low");
  });

  it("takes the strongest tier when a weaker one precedes a stronger", () => {
    expect(scoreConfidence([true, true], [env, proc])).toBe("medium");
  });

  it("keeps the strongest tier when a weaker one follows a stronger", () => {
    expect(scoreConfidence([true, true], [proc, env])).toBe("medium");
  });
});
