import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parallel, readFile, writeFile } from "@canonical/task";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import runGeneratorTask from "./runGeneratorTask.js";

describe("runGeneratorTask", () => {
  let dir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    dir = mkdtempSync(join(tmpdir(), "run-generator-task-"));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  it("runs the task in the given cwd and restores the previous cwd after", async () => {
    await runGeneratorTask(writeFile("out.txt", "hello"), { cwd: dir });

    expect(readFileSync(join(dir, "out.txt"), "utf-8")).toBe("hello");
    expect(process.cwd()).toBe(originalCwd);
  });

  it("returns the task's value", async () => {
    const file = join(dir, "value.txt");
    await runGeneratorTask(writeFile(file, "payload"));

    expect(await runGeneratorTask(readFile(file))).toBe("payload");
  });

  it("does not chdir when no cwd is given, running in the process directory", async () => {
    process.chdir(dir);
    await runGeneratorTask(writeFile("here.txt", "x"));

    expect(readFileSync(join(dir, "here.txt"), "utf-8")).toBe("x");
  });

  it("does not chdir when the given cwd already equals the process directory", async () => {
    process.chdir(dir);
    await runGeneratorTask(writeFile("same.txt", "x"), { cwd: dir });

    expect(readFileSync(join(dir, "same.txt"), "utf-8")).toBe("x");
    expect(process.cwd()).toBe(dir);
  });

  it("restores the previous cwd even when the task throws", async () => {
    await expect(
      runGeneratorTask(readFile(join(dir, "absent.txt")), { cwd: dir }),
    ).rejects.toThrow();
    expect(process.cwd()).toBe(originalCwd);
  });

  it("runs concurrent tasks, which the core places no restrictions on", async () => {
    await runGeneratorTask(
      parallel([writeFile("a.txt", "a"), writeFile("b.txt", "b")]),
      { cwd: dir },
    );

    expect(readFileSync(join(dir, "a.txt"), "utf-8")).toBe("a");
    expect(readFileSync(join(dir, "b.txt"), "utf-8")).toBe("b");
  });
});
