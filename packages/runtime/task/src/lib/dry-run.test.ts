import { describe, expect, it } from "vitest";
import { parallel, sequence, sequence_, traverse } from "./combinators.js";
import {
  assertEffects,
  assertFileWrites,
  collectEffects,
  countEffects,
  dryRun,
  dryRunWith,
  expectTask,
  filterEffects,
  getAffectedFiles,
  getFileWrites,
  mockEffect,
} from "./dry-run.js";
import {
  appendFile,
  copyFile,
  deleteFile,
  exec,
  exists,
  getContext,
  glob,
  info,
  mkdir,
  promptConfirm,
  promptMultiselect,
  promptSelect,
  promptText,
  readFile,
  setContext,
  symlink,
  writeFile,
} from "./primitives.js";
import { effect, fail, flatMap, map, pure } from "./task.js";
import type { Effect, TaskError } from "./types.js";

// =============================================================================
// Core dryRun Function
// =============================================================================

describe("Dry-Run - Core dryRun Function", () => {
  describe("basic functionality", () => {
    it("collects effects from a task", () => {
      const task = sequence_([
        mkdir("/tmp/test"),
        writeFile("/tmp/test/file.txt", "hello"),
        info("Done"),
      ]);

      const result = dryRun(task);

      expect(result.effects.length).toBe(3);
      expect(result.effects[0]._tag).toBe("MakeDir");
      expect(result.effects[1]._tag).toBe("WriteFile");
      expect(result.effects[2]._tag).toBe("Log");
    });

    it("returns the final value", () => {
      const task = flatMap(pure(10), (x) => pure(x * 2));
      const result = dryRun(task);

      expect(result.value).toBe(20);
    });

    it("handles empty tasks (pure values)", () => {
      const task = pure(42);
      const result = dryRun(task);

      expect(result.value).toBe(42);
      expect(result.effects.length).toBe(0);
    });

    it("throws TaskExecutionError for failed tasks", () => {
      const error: TaskError = { code: "ERR", message: "test error" };
      const task = fail<number>(error);

      expect(() => dryRun(task)).toThrow("test error");
    });

    it("throws on failure in chains", () => {
      const error: TaskError = { code: "ERR", message: "chain error" };
      const task = flatMap(fail<number>(error), (x) => pure(x * 2));

      expect(() => dryRun(task)).toThrow("chain error");
    });
  });

  describe("effect handling", () => {
    it("collects ReadFile effects", () => {
      const task = readFile("/test.txt");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("ReadFile");
    });

    it("collects WriteFile effects", () => {
      const task = writeFile("/output.txt", "content");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("WriteFile");
      expect((effects[0] as { content: string }).content).toBe("content");
    });

    it("collects Exec effects", () => {
      const task = exec("npm", ["install"], "/project");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Exec");
    });

    it("collects Prompt effects", () => {
      const task = promptText("name", "Enter name:");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Prompt");
    });

    it("collects Log effects", () => {
      const task = info("test message");
      const { effects } = dryRun(task);

      expect(effects.length).toBe(1);
      expect(effects[0]._tag).toBe("Log");
    });

    it("collects Context effects", () => {
      const task = sequence_([setContext("key", "value"), getContext("key")]);
      const { effects } = dryRun(task);

      expect(effects.length).toBe(2);
      expect(effects[0]._tag).toBe("WriteContext");
      expect(effects[1]._tag).toBe("ReadContext");
    });
  });
});

// =============================================================================
// mockEffect
// =============================================================================

describe("Dry-Run - mockEffect", () => {
  it("returns mock content for ReadFile", () => {
    const effect: Effect = { _tag: "ReadFile", path: "/test.txt" };
    const result = mockEffect(effect);

    expect(result).toBe("[mock content of /test.txt]");
  });

  it("returns true for Exists", () => {
    const effect: Effect = { _tag: "Exists", path: "/any/path" };
    const result = mockEffect(effect);

    expect(result).toBe(true);
  });

  it("returns empty array for Glob", () => {
    const effect: Effect = { _tag: "Glob", pattern: "**/*.ts", cwd: "/src" };
    const result = mockEffect(effect);

    expect(result).toEqual([]);
  });

  it("returns undefined for WriteFile", () => {
    const effect: Effect = {
      _tag: "WriteFile",
      path: "/out.txt",
      content: "x",
    };
    const result = mockEffect(effect);

    expect(result).toBeUndefined();
  });

  it("returns undefined for MakeDir", () => {
    const effect: Effect = { _tag: "MakeDir", path: "/dir", recursive: true };
    const result = mockEffect(effect);

    expect(result).toBeUndefined();
  });

  it("returns mock ExecResult for Exec", () => {
    const effect: Effect = { _tag: "Exec", command: "npm", args: ["install"] };
    const result = mockEffect(effect);

    expect(result).toEqual({ stdout: "", stderr: "", exitCode: 0 });
  });

  it("returns default for text Prompt", () => {
    const effect: Effect = {
      _tag: "Prompt",
      question: { type: "text", name: "x", message: "?", default: "default" },
    };
    const result = mockEffect(effect);

    expect(result).toBe("default");
  });

  it("returns default for confirm Prompt", () => {
    const effect: Effect = {
      _tag: "Prompt",
      question: { type: "confirm", name: "x", message: "?", default: true },
    };
    const result = mockEffect(effect);

    expect(result).toBe(true);
  });

  it("returns first choice for select Prompt without default", () => {
    const effect: Effect = {
      _tag: "Prompt",
      question: {
        type: "select",
        name: "x",
        message: "?",
        choices: [
          { label: "A", value: "a" },
          { label: "B", value: "b" },
        ],
      },
    };
    const result = mockEffect(effect);

    expect(result).toBe("a");
  });

  it("returns undefined for Log", () => {
    const effect: Effect = { _tag: "Log", level: "info", message: "test" };
    const result = mockEffect(effect);

    expect(result).toBeUndefined();
  });

  it("returns undefined for WriteContext", () => {
    const effect: Effect = {
      _tag: "WriteContext",
      key: "k",
      value: "v",
    };
    const result = mockEffect(effect);

    expect(result).toBeUndefined();
  });

  it("returns undefined for ReadContext", () => {
    const effect: Effect = { _tag: "ReadContext", key: "k" };
    const result = mockEffect(effect);

    expect(result).toBeUndefined();
  });

  it("returns empty array for multiselect Prompt", () => {
    const effect: Effect = {
      _tag: "Prompt",
      question: {
        type: "multiselect",
        name: "items",
        message: "Select items:",
        choices: [
          { label: "A", value: "a" },
          { label: "B", value: "b" },
        ],
      },
    };
    const result = mockEffect(effect);

    expect(result).toEqual([]);
  });

  it("returns default for multiselect Prompt when provided", () => {
    const effect: Effect = {
      _tag: "Prompt",
      question: {
        type: "multiselect",
        name: "items",
        message: "Select:",
        choices: [
          { label: "A", value: "a" },
          { label: "B", value: "b" },
        ],
        default: ["a", "b"],
      },
    };
    const result = mockEffect(effect);

    expect(result).toEqual(["a", "b"]);
  });

  it("returns empty string for text Prompt without default", () => {
    const effect: Effect = {
      _tag: "Prompt",
      question: { type: "text", name: "x", message: "?" },
    };
    const result = mockEffect(effect);

    expect(result).toBe("");
  });

  it("returns false for confirm Prompt without default", () => {
    const effect: Effect = {
      _tag: "Prompt",
      question: { type: "confirm", name: "x", message: "?" },
    };
    const result = mockEffect(effect);

    expect(result).toBe(false);
  });

  it("returns default for select Prompt when provided", () => {
    const effect: Effect = {
      _tag: "Prompt",
      question: {
        type: "select",
        name: "x",
        message: "?",
        choices: [
          { label: "A", value: "a" },
          { label: "B", value: "b" },
        ],
        default: "b",
      },
    };
    const result = mockEffect(effect);

    expect(result).toBe("b");
  });

  it("returns empty string for select Prompt with empty choices and no default", () => {
    const effect: Effect = {
      _tag: "Prompt",
      question: {
        type: "select",
        name: "x",
        message: "?",
        choices: [],
      },
    };
    const result = mockEffect(effect);

    expect(result).toBe("");
  });

  it("returns undefined for DeleteFile", () => {
    const effect: Effect = { _tag: "DeleteFile", path: "/a.txt" };
    const result = mockEffect(effect);

    expect(result).toBeUndefined();
  });

  it("returns undefined for DeleteDirectory", () => {
    const effect: Effect = { _tag: "DeleteDirectory", path: "/dir" };
    const result = mockEffect(effect);

    expect(result).toBeUndefined();
  });

  it("returns undefined for AppendFile", () => {
    const effect: Effect = {
      _tag: "AppendFile",
      path: "/a.txt",
      content: "x",
      createIfMissing: true,
    };
    const result = mockEffect(effect);

    expect(result).toBeUndefined();
  });

  it("returns undefined for CopyFile", () => {
    const effect: Effect = {
      _tag: "CopyFile",
      source: "/src.txt",
      dest: "/dst.txt",
    };
    const result = mockEffect(effect);

    expect(result).toBeUndefined();
  });

  it("returns undefined for CopyDirectory", () => {
    const effect: Effect = {
      _tag: "CopyDirectory",
      source: "/src",
      dest: "/dst",
    };
    const result = mockEffect(effect);

    expect(result).toBeUndefined();
  });

  it("returns undefined for Symlink", () => {
    const effect: Effect = {
      _tag: "Symlink",
      target: "/target",
      path: "/link",
    };
    const result = mockEffect(effect);

    expect(result).toBeUndefined();
  });

  it("runs Parallel children and returns array of values", () => {
    const effect: Effect = {
      _tag: "Parallel",
      tasks: [pure(1), pure(2), pure(3)],
    };
    const result = mockEffect(effect);

    expect(result).toEqual([1, 2, 3]);
  });

  it("runs Race first child and returns its value", () => {
    const effect: Effect = {
      _tag: "Race",
      tasks: [pure(42), pure(99)],
    };
    const result = mockEffect(effect);

    expect(result).toBe(42);
  });

  it("returns undefined for Race with empty tasks", () => {
    const effect: Effect = {
      _tag: "Race",
      tasks: [],
    };
    const result = mockEffect(effect);

    expect(result).toBeUndefined();
  });
});

// =============================================================================
// dryRun mock values in tasks
// =============================================================================

describe("Dry-Run - mock values in tasks", () => {
  it("returns mock content for ReadFile task", () => {
    const task = readFile("/test.txt");
    const { value } = dryRun(task);

    expect(value).toBe("[mock content of /test.txt]");
  });

  it("returns false for Exists task when file not created during dry-run", () => {
    const task = exists("/any/path");
    const { value } = dryRun(task);

    expect(value).toBe(false);
  });

  it("returns true for Exists task when file was created during dry-run", () => {
    const task = flatMap(writeFile("/any/path", "content"), () =>
      exists("/any/path"),
    );
    const { value } = dryRun(task);

    expect(value).toBe(true);
  });

  it("returns empty array for Glob task", () => {
    const task = glob("**/*.ts", "/src");
    const { value } = dryRun(task);

    expect(value).toEqual([]);
  });

  it("returns mock ExecResult for Exec task", () => {
    const task = exec("npm", ["install"]);
    const { value } = dryRun(task);

    expect(value).toEqual({ stdout: "", stderr: "", exitCode: 0 });
  });

  it("returns default for promptText task", () => {
    const task = promptText("name", "Name?", "default");
    const { value } = dryRun(task);

    expect(value).toBe("default");
  });

  it("returns default for promptConfirm task", () => {
    const task = promptConfirm("proceed", "Continue?", true);
    const { value } = dryRun(task);

    expect(value).toBe(true);
  });

  it("returns default for promptSelect task", () => {
    const choices = [
      { label: "A", value: "a" },
      { label: "B", value: "b" },
    ];
    const task = promptSelect("choice", "Pick:", choices, "b");
    const { value } = dryRun(task);

    expect(value).toBe("b");
  });

  it("returns first choice when no default for promptSelect task", () => {
    const choices = [
      { label: "First", value: "first" },
      { label: "Second", value: "second" },
    ];
    const task = promptSelect("choice", "Pick:", choices);
    const { value } = dryRun(task);

    expect(value).toBe("first");
  });
});

// =============================================================================
// dryRunWith - custom mocks
// =============================================================================

describe("Dry-Run - dryRunWith", () => {
  it("uses custom mock for specified effect type", () => {
    const customMocks = new Map<string, (e: Effect) => unknown>();
    customMocks.set("ReadFile", () => "custom content");

    const task = readFile("/test.txt");
    const { value } = dryRunWith(task, customMocks);

    expect(value).toBe("custom content");
  });

  it("falls back to default mock for unspecified types", () => {
    const customMocks = new Map<string, (e: Effect) => unknown>();
    customMocks.set("ReadFile", () => "custom content");

    const task = sequence([readFile("/test.txt"), exists("/other.txt")]);
    const { value } = dryRunWith(task, customMocks);

    expect(value[0]).toBe("custom content");
    expect(value[1]).toBe(true); // default mock for Exists
  });

  it("receives the effect in custom mock function", () => {
    const customMocks = new Map<string, (e: Effect) => unknown>();
    customMocks.set("ReadFile", (e) => {
      if (e._tag === "ReadFile") {
        return `content of ${e.path}`;
      }
      return "";
    });

    const task = readFile("/my-file.txt");
    const { value } = dryRunWith(task, customMocks);

    expect(value).toBe("content of /my-file.txt");
  });

  it("collects effects same as dryRun", () => {
    const customMocks = new Map<string, (e: Effect) => unknown>();

    const task = sequence_([
      writeFile("/a.txt", "a"),
      writeFile("/b.txt", "b"),
    ]);
    const { effects } = dryRunWith(task, customMocks);

    expect(effects.length).toBe(2);
    expect(effects[0]._tag).toBe("WriteFile");
    expect(effects[1]._tag).toBe("WriteFile");
  });
});

// =============================================================================
// collectEffects
// =============================================================================

describe("Dry-Run - collectEffects", () => {
  it("collects all effects from a task", () => {
    const task = sequence_([
      writeFile("/a.txt", "a"),
      writeFile("/b.txt", "b"),
    ]);

    const effects = collectEffects(task);

    expect(effects.length).toBe(2);
    expect(effects.every((e) => e._tag === "WriteFile")).toBe(true);
  });

  it("returns empty array for pure tasks", () => {
    const effects = collectEffects(pure(42));
    expect(effects.length).toBe(0);
  });

  it("handles complex nested tasks", () => {
    const task = traverse([1, 2, 3], (n) =>
      sequence_([info(`Processing ${n}`), writeFile(`/${n}.txt`, String(n))]),
    );

    const effects = collectEffects(task);

    expect(effects.filter((e) => e._tag === "Log").length).toBe(3);
    expect(effects.filter((e) => e._tag === "WriteFile").length).toBe(3);
  });

  it("does not throw on failed tasks - stops at failure", () => {
    const error: TaskError = { code: "ERR", message: "error" };
    const task = sequence_([writeFile("/a.txt", "a"), fail(error)]);

    // collectEffects stops at Fail node, does not throw
    const effects = collectEffects(task);
    expect(effects.length).toBe(1);
  });
});

// =============================================================================
// countEffects
// =============================================================================

describe("Dry-Run - countEffects", () => {
  it("counts effects by type", () => {
    const task = sequence_([
      mkdir("/tmp/a"),
      mkdir("/tmp/b"),
      writeFile("/tmp/a/file.txt", "content"),
      info("Log 1"),
      info("Log 2"),
      info("Log 3"),
    ]);

    const { effects } = dryRun(task);
    const counts = countEffects(effects);

    expect(counts.MakeDir).toBe(2);
    expect(counts.WriteFile).toBe(1);
    expect(counts.Log).toBe(3);
  });

  it("returns undefined for missing types (not 0)", () => {
    const task = writeFile("/test.txt", "content");
    const { effects } = dryRun(task);
    const counts = countEffects(effects);

    expect(counts.WriteFile).toBe(1);
    expect(counts.ReadFile).toBeUndefined();
    expect(counts.MakeDir).toBeUndefined();
  });

  it("handles empty effects array", () => {
    const counts = countEffects([]);

    expect(counts.WriteFile).toBeUndefined();
    expect(counts.ReadFile).toBeUndefined();
    expect(Object.keys(counts).length).toBe(0);
  });
});

// =============================================================================
// filterEffects
// =============================================================================

describe("Dry-Run - filterEffects", () => {
  it("filters effects by tag", () => {
    const task = sequence_([
      mkdir("/tmp/test"),
      writeFile("/tmp/test/a.txt", "a"),
      writeFile("/tmp/test/b.txt", "b"),
      info("Done"),
    ]);

    const { effects } = dryRun(task);
    const writes = filterEffects(effects, "WriteFile");

    expect(writes.length).toBe(2);
    expect(writes[0].path).toBe("/tmp/test/a.txt");
    expect(writes[1].path).toBe("/tmp/test/b.txt");
  });

  it("returns empty array when no matches", () => {
    const task = writeFile("/test.txt", "content");
    const { effects } = dryRun(task);
    const logs = filterEffects(effects, "Log");

    expect(logs.length).toBe(0);
  });

  it("works with all effect types", () => {
    const task = sequence_([
      readFile("/input.txt"),
      mkdir("/output"),
      writeFile("/output/file.txt", "content"),
      exec("npm", ["install"]),
      info("Done"),
    ]);

    const { effects } = dryRun(task);

    expect(filterEffects(effects, "ReadFile").length).toBe(1);
    expect(filterEffects(effects, "MakeDir").length).toBe(1);
    expect(filterEffects(effects, "WriteFile").length).toBe(1);
    expect(filterEffects(effects, "Exec").length).toBe(1);
    expect(filterEffects(effects, "Log").length).toBe(1);
  });

  it("returns typed results", () => {
    const task = writeFile("/test.txt", "content");
    const { effects } = dryRun(task);
    const writes = filterEffects(effects, "WriteFile");

    // Type should allow accessing WriteFile-specific properties
    expect(writes[0].path).toBe("/test.txt");
    expect(writes[0].content).toBe("content");
  });
});

// =============================================================================
// getFileWrites
// =============================================================================

describe("Dry-Run - getFileWrites", () => {
  it("extracts file write paths and contents", () => {
    const task = sequence_([
      writeFile("/a.txt", "content a"),
      writeFile("/b.txt", "content b"),
    ]);

    const { effects } = dryRun(task);
    const writes = getFileWrites(effects);

    expect(writes).toEqual([
      { path: "/a.txt", content: "content a" },
      { path: "/b.txt", content: "content b" },
    ]);
  });

  it("returns empty array when no writes", () => {
    const task = readFile("/test.txt");
    const { effects } = dryRun(task);
    const writes = getFileWrites(effects);

    expect(writes).toEqual([]);
  });

  it("preserves order", () => {
    const task = sequence_([
      writeFile("/1.txt", "1"),
      writeFile("/2.txt", "2"),
      writeFile("/3.txt", "3"),
    ]);

    const { effects } = dryRun(task);
    const writes = getFileWrites(effects);

    expect(writes.map((w) => w.path)).toEqual(["/1.txt", "/2.txt", "/3.txt"]);
  });

  it("only includes WriteFile effects", () => {
    const task = sequence_([
      mkdir("/dir"),
      writeFile("/dir/file.txt", "content"),
      info("done"),
    ]);

    const { effects } = dryRun(task);
    const writes = getFileWrites(effects);

    expect(writes.length).toBe(1);
    expect(writes[0].path).toBe("/dir/file.txt");
  });
});

// =============================================================================
// getAffectedFiles
// =============================================================================

describe("Dry-Run - getAffectedFiles", () => {
  it("returns unique sorted list of affected files", () => {
    const task = sequence_([
      mkdir("/tmp/dir"),
      writeFile("/tmp/dir/a.txt", "a"),
      writeFile("/tmp/dir/b.txt", "b"),
    ]);

    const { effects } = dryRun(task);
    const files = getAffectedFiles(effects);

    expect(files).toEqual(["/tmp/dir", "/tmp/dir/a.txt", "/tmp/dir/b.txt"]);
  });

  it("deduplicates paths", () => {
    const task = sequence_([
      writeFile("/same.txt", "first"),
      readFile("/same.txt"),
      writeFile("/same.txt", "second"),
    ]);

    const { effects } = dryRun(task);
    const files = getAffectedFiles(effects);

    // Should only appear once
    expect(files.filter((f) => f === "/same.txt").length).toBe(1);
  });

  it("includes dest (not source) for CopyFile", () => {
    const task = copyFile("/source.txt", "/dest.txt");
    const { effects } = dryRun(task);
    const files = getAffectedFiles(effects);

    // Only dest is considered "affected"
    expect(files).toContain("/dest.txt");
    expect(files).not.toContain("/source.txt");
  });

  it("returns empty array for non-file effects", () => {
    const task = sequence_([info("message"), exec("ls", [])]);
    const { effects } = dryRun(task);
    const files = getAffectedFiles(effects);

    expect(files).toEqual([]);
  });

  it("sorts paths alphabetically", () => {
    const task = sequence_([
      writeFile("/z.txt", "z"),
      writeFile("/a.txt", "a"),
      writeFile("/m.txt", "m"),
    ]);

    const { effects } = dryRun(task);
    const files = getAffectedFiles(effects);

    expect(files).toEqual(["/a.txt", "/m.txt", "/z.txt"]);
  });
});

// =============================================================================
// assertEffects
// =============================================================================

describe("Dry-Run - assertEffects", () => {
  it("passes when effects match", () => {
    const task = sequence_([writeFile("/a.txt", "a"), info("done")]);

    expect(() =>
      assertEffects(task, [
        { _tag: "WriteFile", path: "/a.txt" },
        { _tag: "Log", message: "done" },
      ]),
    ).not.toThrow();
  });

  it("throws when effect count differs", () => {
    const task = writeFile("/a.txt", "a");

    expect(() =>
      assertEffects(task, [{ _tag: "WriteFile" }, { _tag: "WriteFile" }]),
    ).toThrow("Expected 2 effects, got 1");
  });

  it("throws when effect property differs", () => {
    const task = writeFile("/a.txt", "a");

    expect(() =>
      assertEffects(task, [{ _tag: "WriteFile", path: "/b.txt" }]),
    ).toThrow();
  });

  it("only checks specified properties", () => {
    const task = writeFile("/a.txt", "content");

    // Should pass - only checking _tag
    expect(() => assertEffects(task, [{ _tag: "WriteFile" }])).not.toThrow();
  });
});

// =============================================================================
// assertFileWrites
// =============================================================================

describe("Dry-Run - assertFileWrites", () => {
  it("passes when file writes match", () => {
    const task = sequence_([
      mkdir("/dir"),
      writeFile("/a.txt", "a"),
      writeFile("/b.txt", "b"),
    ]);

    // assertFileWrites checks getAffectedFiles which includes mkdir paths
    expect(() =>
      assertFileWrites(task, ["/a.txt", "/b.txt", "/dir"]),
    ).not.toThrow();
  });

  it("throws when file count differs", () => {
    const task = writeFile("/a.txt", "a");

    expect(() => assertFileWrites(task, ["/a.txt", "/b.txt"])).toThrow();
  });

  it("throws when file path differs", () => {
    const task = writeFile("/a.txt", "a");

    expect(() => assertFileWrites(task, ["/b.txt"])).toThrow();
  });

  it("sorts both actual and expected for comparison", () => {
    const task = sequence_([
      writeFile("/z.txt", "z"),
      writeFile("/a.txt", "a"),
    ]);

    // Order in expected doesn't matter since both are sorted
    expect(() => assertFileWrites(task, ["/a.txt", "/z.txt"])).not.toThrow();
  });
});

// =============================================================================
// expectTask
// =============================================================================

describe("Dry-Run - expectTask", () => {
  describe("toHaveValue", () => {
    it("passes when value matches", () => {
      const task = pure(42);
      const matcher = expectTask(task);

      expect(() => matcher.toHaveValue(42)).not.toThrow();
    });

    it("throws when value does not match", () => {
      const task = pure(42);
      const matcher = expectTask(task);

      expect(() => matcher.toHaveValue(99)).toThrow();
    });

    it("uses strict equality for primitive values", () => {
      const task = pure("hello");
      const matcher = expectTask(task);

      expect(() => matcher.toHaveValue("hello")).not.toThrow();
      expect(() => matcher.toHaveValue("world")).toThrow();
    });
  });

  describe("toHaveEffectCount", () => {
    it("passes when count matches", () => {
      const task = sequence_([
        writeFile("/a.txt", "a"),
        writeFile("/b.txt", "b"),
      ]);

      const matcher = expectTask(task);
      expect(() => matcher.toHaveEffectCount(2)).not.toThrow();
    });

    it("throws when count does not match", () => {
      const task = sequence_([
        writeFile("/a.txt", "a"),
        writeFile("/b.txt", "b"),
      ]);

      const matcher = expectTask(task);
      expect(() => matcher.toHaveEffectCount(3)).toThrow();
    });

    it("works with zero effects", () => {
      const task = pure(42);
      const matcher = expectTask(task);

      expect(() => matcher.toHaveEffectCount(0)).not.toThrow();
    });
  });

  describe("toWriteFile", () => {
    it("passes when file is written", () => {
      const task = writeFile("/test.txt", "content");
      const matcher = expectTask(task);

      expect(() => matcher.toWriteFile("/test.txt")).not.toThrow();
    });

    it("throws when file is not written", () => {
      const task = writeFile("/test.txt", "content");
      const matcher = expectTask(task);

      expect(() => matcher.toWriteFile("/other.txt")).toThrow();
    });

    it("works with multiple writes", () => {
      const task = sequence_([
        writeFile("/a.txt", "a"),
        writeFile("/b.txt", "b"),
        writeFile("/c.txt", "c"),
      ]);

      const matcher = expectTask(task);
      expect(() => matcher.toWriteFile("/b.txt")).not.toThrow();
    });
  });

  describe("toNotWriteFile", () => {
    it("passes when file is not written", () => {
      const task = writeFile("/test.txt", "content");
      const matcher = expectTask(task);

      expect(() => matcher.toNotWriteFile("/other.txt")).not.toThrow();
    });

    it("throws when file is written", () => {
      const task = writeFile("/test.txt", "content");
      const matcher = expectTask(task);

      expect(() => matcher.toNotWriteFile("/test.txt")).toThrow();
    });
  });

  describe("exposed properties", () => {
    it("exposes effects array", () => {
      const task = sequence_([
        writeFile("/a.txt", "a"),
        writeFile("/b.txt", "b"),
      ]);

      const matcher = expectTask(task);

      expect(matcher.effects.length).toBe(2);
      expect(matcher.effects[0]._tag).toBe("WriteFile");
    });

    it("exposes value", () => {
      const task = pure(42);
      const matcher = expectTask(task);

      expect(matcher.value).toBe(42);
    });

    it("exposes value for effect tasks", () => {
      const task = map(writeFile("/test.txt", "content"), () => "done");
      const matcher = expectTask(task);

      expect(matcher.value).toBe("done");
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("Dry-Run - Integration", () => {
  it("can test complex workflows", () => {
    const generateFiles = traverse(["a", "b", "c"], (name) =>
      sequence_([
        mkdir(`/output/${name}`),
        writeFile(`/output/${name}/index.ts`, `export const ${name} = true;`),
        info(`Created ${name}`),
      ]),
    );

    const matcher = expectTask(generateFiles);

    expect(matcher.effects.length).toBe(9); // 3 * (mkdir + writeFile + log)
    matcher.toWriteFile("/output/b/index.ts");
  });

  it("can verify effect order", () => {
    const task = sequence_([
      info("Step 1"),
      mkdir("/output"),
      info("Step 2"),
      writeFile("/output/file.txt", "content"),
      info("Step 3"),
    ]);

    const { effects } = dryRun(task);

    expect(effects[0]._tag).toBe("Log");
    expect((effects[0] as { message: string }).message).toBe("Step 1");

    expect(effects[1]._tag).toBe("MakeDir");

    expect(effects[2]._tag).toBe("Log");
    expect((effects[2] as { message: string }).message).toBe("Step 2");

    expect(effects[3]._tag).toBe("WriteFile");

    expect(effects[4]._tag).toBe("Log");
    expect((effects[4] as { message: string }).message).toBe("Step 3");
  });

  it("can use filterEffects for detailed assertions", () => {
    const task = sequence_([
      writeFile("/a.txt", "content a"),
      info("log 1"),
      writeFile("/b.txt", "content b"),
      info("log 2"),
    ]);

    const { effects } = dryRun(task);
    const writes = filterEffects(effects, "WriteFile");
    const logs = filterEffects(effects, "Log");

    expect(writes.length).toBe(2);
    expect(writes[0].content).toBe("content a");
    expect(writes[1].content).toBe("content b");

    expect(logs.length).toBe(2);
    expect(logs[0].message).toBe("log 1");
    expect(logs[1].message).toBe("log 2");
  });
});

// =============================================================================
// dryRun - Parallel and Race handling
// =============================================================================

describe("Dry-Run - Parallel and Race in dryRun", () => {
  it("collects effects from Parallel children", () => {
    const task = parallel([writeFile("/a.txt", "a"), writeFile("/b.txt", "b")]);

    const { effects } = dryRun(task);

    expect(effects.length).toBe(2);
    expect(
      filterEffects(effects, "WriteFile")
        .map((w) => w.path)
        .sort(),
    ).toEqual(["/a.txt", "/b.txt"]);
  });

  it("returns combined results from Parallel", () => {
    const task = parallel([pure(1), pure(2), pure(3)]);
    const { value } = dryRun(task);

    expect(value).toEqual([1, 2, 3]);
  });

  it("collects effects from Race first child only", () => {
    const task = effect<unknown>({
      _tag: "Race",
      tasks: [writeFile("/first.txt", "f"), writeFile("/second.txt", "s")],
    });

    const { effects } = dryRun(task);

    expect(effects.length).toBe(1);
    expect(filterEffects(effects, "WriteFile")[0].path).toBe("/first.txt");
  });

  it("handles Race with empty tasks", () => {
    const task = effect<unknown>({
      _tag: "Race",
      tasks: [],
    });

    const { value, effects } = dryRun(task);

    expect(value).toBeUndefined();
    expect(effects.length).toBe(0);
  });

  it("shares virtual filesystem state between Parallel children", () => {
    // First child writes a file, second child checks if it exists
    // Due to parallel execution, virtual FS state is shared
    const task = parallel([
      writeFile("/marker.txt", "x"),
      exists("/marker.txt"),
    ]);

    const { effects } = dryRun(task);
    expect(effects.length).toBe(2);
  });

  it("collects effects from nested Parallel inside sequence", () => {
    const task = sequence_([
      info("start"),
      parallel([writeFile("/a.txt", "a"), writeFile("/b.txt", "b")]),
      info("end"),
    ]);

    const { effects } = dryRun(task);

    expect(effects.length).toBe(4); // Log + 2 WriteFile + Log
  });

  it("tracks symlink in virtual FS for exists check", () => {
    const task = flatMap(symlink("/target", "/link"), () => exists("/link"));
    const { value } = dryRun(task);

    expect(value).toBe(true);
  });

  it("dryRunWithVirtualFs handles Fail in Parallel child", () => {
    const task = parallel([
      writeFile("/a.txt", "a"),
      fail({ code: "ERR", message: "child error" }),
    ]);

    expect(() => dryRun(task)).toThrow("child error");
  });

  it("dryRunWithVirtualFs handles nested Parallel", () => {
    const inner = parallel([
      writeFile("/x.txt", "x"),
      writeFile("/y.txt", "y"),
    ]);
    const task = parallel([inner, writeFile("/z.txt", "z")]);

    const { effects } = dryRun(task);

    expect(effects.length).toBe(3);
  });

  it("dryRunWithVirtualFs handles Race inside Parallel child", () => {
    const raceChild = effect<unknown>({
      _tag: "Race",
      tasks: [writeFile("/first.txt", "f"), writeFile("/second.txt", "s")],
    });
    const task = parallel([raceChild, writeFile("/other.txt", "o")]);

    const { effects } = dryRun(task);

    // Race takes first child only + other
    expect(effects.length).toBe(2);
    expect(
      filterEffects(effects, "WriteFile")
        .map((w) => w.path)
        .sort(),
    ).toEqual(["/first.txt", "/other.txt"]);
  });

  it("dryRunWithVirtualFs handles Race with empty tasks inside Parallel", () => {
    const emptyRace = effect<unknown>({
      _tag: "Race",
      tasks: [],
    });
    const task = parallel([emptyRace, writeFile("/a.txt", "a")]);

    const { effects } = dryRun(task);

    expect(effects.length).toBe(1);
  });

  it("dryRunWithVirtualFs tracks WriteFile in virtual FS", () => {
    // Parallel child writes, then later in sequence check exists
    const task = flatMap(parallel([writeFile("/marker.txt", "x")]), () =>
      exists("/marker.txt"),
    );

    const { value } = dryRun(task);

    expect(value).toBe(true);
  });

  it("dryRunWithVirtualFs tracks AppendFile in virtual FS", () => {
    const task = flatMap(parallel([appendFile("/log.txt", "entry\n")]), () =>
      exists("/log.txt"),
    );

    const { value } = dryRun(task);

    expect(value).toBe(true);
  });

  it("dryRunWithVirtualFs tracks MakeDir in virtual FS", () => {
    const task = flatMap(parallel([mkdir("/newdir")]), () => exists("/newdir"));

    const { value } = dryRun(task);

    expect(value).toBe(true);
  });

  it("dryRunWithVirtualFs uses mockEffect for other effect types", () => {
    const task = parallel([readFile("/test.txt")]);
    const { value } = dryRun(task);

    // The value is an array from parallel; the child value is the mock
    expect(value).toEqual(["[mock content of /test.txt]"]);
  });
});

// =============================================================================
// dryRunWith - additional coverage
// =============================================================================

describe("Dry-Run - dryRunWith additional paths", () => {
  it("throws TaskExecutionError for failed tasks", () => {
    const error: TaskError = { code: "ERR", message: "fail in dryRunWith" };
    const task = fail<number>(error);
    const mocks = new Map<string, (e: Effect) => unknown>();

    expect(() => dryRunWith(task, mocks)).toThrow("fail in dryRunWith");
  });
});

// =============================================================================
// getAffectedFiles - additional effect types
// =============================================================================

describe("Dry-Run - getAffectedFiles additional types", () => {
  it("includes Symlink path", () => {
    const task = symlink("/target", "/link");
    const { effects } = dryRun(task);
    const files = getAffectedFiles(effects);

    expect(files).toContain("/link");
  });

  it("includes DeleteFile path", () => {
    const task = deleteFile("/to-delete.txt");
    const { effects } = dryRun(task);
    const files = getAffectedFiles(effects);

    expect(files).toContain("/to-delete.txt");
  });

  it("includes AppendFile path", () => {
    const task = appendFile("/log.txt", "entry\n");
    const { effects } = dryRun(task);
    const files = getAffectedFiles(effects);

    expect(files).toContain("/log.txt");
  });
});

// =============================================================================
// dryRun - mock values for multiselect
// =============================================================================

describe("Dry-Run - mock values for multiselect Prompt in task", () => {
  it("returns empty array for multiselect prompt task", () => {
    const task = promptMultiselect("items", "Select:", [
      { label: "A", value: "a" },
      { label: "B", value: "b" },
    ]);
    const { value } = dryRun(task);

    expect(value).toEqual([]);
  });
});
