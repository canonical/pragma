import { describe, expect, it } from "bun:test";
import { sequence_ } from "../combinators.js";
import {
  collectEffects,
  countEffects,
  dryRun,
  expectTask,
  filterEffects,
  getAffectedFiles,
  getFileWrites,
} from "../dry-run.js";
import { info, mkdir, writeFile } from "../primitives.js";
import { flatMap, pure } from "../task.js";

describe("Dry-Run Interpreter", () => {
  describe("dryRun", () => {
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

    it("handles empty tasks", () => {
      const task = pure(42);
      const result = dryRun(task);
      expect(result.value).toBe(42);
      expect(result.effects.length).toBe(0);
    });
  });

  describe("collectEffects", () => {
    it("collects all effects from a task", () => {
      const task = sequence_([
        writeFile("/a.txt", "a"),
        writeFile("/b.txt", "b"),
      ]);

      const effects = collectEffects(task);
      expect(effects.length).toBe(2);
    });
  });

  describe("countEffects", () => {
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
  });

  describe("filterEffects", () => {
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
  });

  describe("getFileWrites", () => {
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
  });

  describe("getAffectedFiles", () => {
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
  });
});

describe("Test Utilities", () => {
  describe("expectTask", () => {
    it("provides toHaveValue assertion", () => {
      const task = pure(42);
      const matcher = expectTask(task);
      expect(() => matcher.toHaveValue(42)).not.toThrow();
      expect(() => matcher.toHaveValue(99)).toThrow();
    });

    it("provides toHaveEffectCount assertion", () => {
      const task = sequence_([
        writeFile("/a.txt", "a"),
        writeFile("/b.txt", "b"),
      ]);

      const matcher = expectTask(task);
      expect(() => matcher.toHaveEffectCount(2)).not.toThrow();
      expect(() => matcher.toHaveEffectCount(3)).toThrow();
    });

    it("provides toWriteFile assertion", () => {
      const task = writeFile("/test.txt", "content");
      const matcher = expectTask(task);
      expect(() => matcher.toWriteFile("/test.txt")).not.toThrow();
      expect(() => matcher.toWriteFile("/other.txt")).toThrow();
    });

    it("provides toNotWriteFile assertion", () => {
      const task = writeFile("/test.txt", "content");
      const matcher = expectTask(task);
      expect(() => matcher.toNotWriteFile("/other.txt")).not.toThrow();
      expect(() => matcher.toNotWriteFile("/test.txt")).toThrow();
    });

    it("exposes effects and value", () => {
      const task = sequence_([
        writeFile("/a.txt", "a"),
        writeFile("/b.txt", "b"),
      ]);

      const matcher = expectTask(task);
      expect(matcher.effects.length).toBe(2);
      expect(matcher.value).toBe(undefined);
    });
  });
});
